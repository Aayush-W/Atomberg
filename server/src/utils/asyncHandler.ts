import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

type AsyncRouteHandler<
  Params extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs
> = (req: Request<Params, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => Promise<unknown>;

export function asyncHandler<
  Params extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs
>(handler: AsyncRouteHandler<Params, ResBody, ReqBody, ReqQuery>): RequestHandler<Params, ResBody, ReqBody, ReqQuery> {
  return (req: Request<Params, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
