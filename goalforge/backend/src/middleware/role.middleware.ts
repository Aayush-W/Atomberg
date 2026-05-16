import { Role } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { forbidden, unauthorized } from '../utils/errors';

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized());
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(forbidden(`Requires one of these roles: ${roles.join(', ')}`));
      return;
    }

    next();
  };
}
