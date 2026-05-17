import { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { unauthorized } from '../utils/errors';
import { verifyAccessToken } from '../utils/auth';

function readBearerToken(req: Request): string | null {
  const header = req.header('authorization');
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = readBearerToken(req);
    if (!token) {
      throw unauthorized();
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true }
    });
    if (!user) {
      throw unauthorized('User no longer exists');
    }
    if (user.tenantId !== payload.tenantId) {
      throw unauthorized('Tenant mismatch');
    }

    req.user = {
      id: user.id,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      tenantSlug: user.tenant.slug,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      jobTitle: user.jobTitle,
      managerId: user.managerId
    };
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      next(unauthorized('Access token expired'));
      return;
    }
    if (error instanceof JsonWebTokenError) {
      next(unauthorized('Invalid access token'));
      return;
    }
    next(error);
  }
}
