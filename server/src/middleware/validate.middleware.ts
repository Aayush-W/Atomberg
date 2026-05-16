import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { badRequest } from '../utils/errors';

type RequestSource = 'body' | 'params' | 'query';

export function validate(schema: ZodSchema, source: RequestSource = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req[source] = schema.parse(req[source]) as typeof req[typeof source];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(badRequest('Validation failed', error.flatten()));
        return;
      }
      next(error);
    }
  };
}
