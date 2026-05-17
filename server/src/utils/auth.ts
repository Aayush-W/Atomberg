import jwt from 'jsonwebtoken';
import { Tenant, User } from '@prisma/client';
import { AuthTokenPayload, PublicUser } from '../types/auth';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

function requiredEnv(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

type UserWithTenant = User & { tenant: Tenant };

export function toPublicUser(user: UserWithTenant): PublicUser {
  return {
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
}

export function signAccessToken(user: PublicUser): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    email: user.email,
    role: user.role,
    type: 'access'
  };

  return jwt.sign(payload, requiredEnv('JWT_SECRET'), { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(user: PublicUser): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    email: user.email,
    role: user.role,
    type: 'refresh'
  };

  return jwt.sign(payload, requiredEnv('JWT_REFRESH_SECRET'), { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, requiredEnv('JWT_SECRET'));
  return assertTokenPayload(decoded, 'access');
}

export function verifyRefreshToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, requiredEnv('JWT_REFRESH_SECRET'));
  return assertTokenPayload(decoded, 'refresh');
}

function assertTokenPayload(decoded: string | jwt.JwtPayload, type: 'access' | 'refresh'): AuthTokenPayload {
  if (
    typeof decoded === 'string' ||
    typeof decoded.sub !== 'string' ||
    typeof decoded.tenantId !== 'string' ||
    typeof decoded.tenantSlug !== 'string' ||
    typeof decoded.email !== 'string' ||
    typeof decoded.role !== 'string' ||
    decoded.type !== type
  ) {
    throw new Error('Invalid token payload');
  }

  return {
    sub: decoded.sub,
    tenantId: decoded.tenantId,
    tenantSlug: decoded.tenantSlug,
    email: decoded.email,
    role: decoded.role as AuthTokenPayload['role'],
    type
  };
}
