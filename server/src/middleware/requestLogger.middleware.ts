import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header('x-request-id') || randomUUID();
  const startedAt = Date.now();

  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'http.request.completed',
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        actorUserId: req.user?.id ?? null,
        tenantId: req.user?.tenantId ?? req.header('x-goalforge-tenant') ?? null
      })
    );
  });

  next();
}
