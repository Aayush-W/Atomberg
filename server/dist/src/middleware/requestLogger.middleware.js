"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
const crypto_1 = require("crypto");
function requestLogger(req, res, next) {
    const requestId = req.header('x-request-id') || (0, crypto_1.randomUUID)();
    const startedAt = Date.now();
    res.setHeader('x-request-id', requestId);
    res.on('finish', () => {
        const durationMs = Date.now() - startedAt;
        console.log(JSON.stringify({
            level: 'info',
            event: 'http.request.completed',
            requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs,
            actorUserId: req.user?.id ?? null,
            tenantId: req.user?.tenantId ?? req.header('x-goalforge-tenant') ?? null
        }));
    });
    next();
}
