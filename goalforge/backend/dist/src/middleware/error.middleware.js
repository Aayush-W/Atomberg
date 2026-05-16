"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const client_1 = require("@prisma/client");
const errors_1 = require("../utils/errors");
function notFoundHandler(req, _res, next) {
    next(new errors_1.AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
}
function errorHandler(err, _req, res, _next) {
    if (err instanceof errors_1.AppError) {
        return res.status(err.statusCode).json({
            error: {
                code: err.code,
                message: err.message,
                details: err.details
            }
        });
    }
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        return res.status(400).json({
            error: {
                code: err.code,
                message: 'Database request failed',
                details: err.meta
            }
        });
    }
    console.error(err);
    return res.status(500).json({
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal server error'
        }
    });
}
