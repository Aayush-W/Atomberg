import { Request } from 'express';
import { AuthUser } from '../types/auth';
import { unauthorized } from '../utils/errors';

export function currentUser(req: Request<any, any, any, any>): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user as AuthUser;
}
