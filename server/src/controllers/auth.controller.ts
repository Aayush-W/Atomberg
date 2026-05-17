import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { signAccessToken, signRefreshToken, toPublicUser, verifyRefreshToken } from '../utils/auth';
import { unauthorized } from '../utils/errors';
import { LoginInput, RefreshInput } from '../validators/auth.validators';
import { getMicrosoftDemoProfiles, syncMicrosoftDemoUser } from '../services/microsoftDemo.service';

const refreshCookieName = 'goalforge_refresh_token';

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export const login = asyncHandler(async (req: Request<unknown, unknown, LoginInput>, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { email: req.body.email },
    include: { tenant: true }
  });
  if (!user) {
    throw unauthorized('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
  if (!isPasswordValid) {
    throw unauthorized('Invalid email or password');
  }

  const publicUser = toPublicUser(user);
  const accessToken = signAccessToken(publicUser);
  const refreshToken = signRefreshToken(publicUser);
  setRefreshCookie(res, refreshToken);

  res.json({ accessToken, refreshToken, user: publicUser });
});

export const refresh = asyncHandler(async (req: Request<unknown, unknown, RefreshInput>, res: Response) => {
  const token = req.body.refreshToken ?? req.cookies?.[refreshCookieName];
  if (!token) {
    throw unauthorized('Refresh token required');
  }

  try {
    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true }
    });
    if (!user) {
      throw unauthorized('User no longer exists');
    }

    const accessToken = signAccessToken(toPublicUser(user));
    res.json({ accessToken });
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw unauthorized('Refresh token expired');
    }
    if (error instanceof JsonWebTokenError) {
      throw unauthorized('Invalid refresh token');
    }
    throw error;
  }
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(refreshCookieName, { path: '/api/auth/refresh' });
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw unauthorized();
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { tenant: true }
  });
  if (!user) {
    throw unauthorized('User no longer exists');
  }

  res.json({ user: toPublicUser(user) });
});

export const microsoftStart = asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    mode: 'demo',
    profiles: getMicrosoftDemoProfiles(),
    callbackBase: '/api/auth/microsoft/callback'
  });
});

export const microsoftCallback = asyncHandler(async (req: Request, res: Response) => {
  const email = typeof req.query.email === 'string' ? req.query.email.toLowerCase() : null;
  if (!email) {
    throw unauthorized('Microsoft demo email is required');
  }

  const user = await syncMicrosoftDemoUser(email);
  const publicUser = toPublicUser(user);
  const accessToken = signAccessToken(publicUser);
  const refreshToken = signRefreshToken(publicUser);
  setRefreshCookie(res, refreshToken);

  res.json({ accessToken, refreshToken, user: publicUser, provider: 'MICROSOFT_DEMO' });
});
