"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = require("jsonwebtoken");
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../utils/errors");
const auth_1 = require("../utils/auth");
function readBearerToken(req) {
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
async function requireAuth(req, _res, next) {
    try {
        const token = readBearerToken(req);
        if (!token) {
            throw (0, errors_1.unauthorized)();
        }
        const payload = (0, auth_1.verifyAccessToken)(token);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user) {
            throw (0, errors_1.unauthorized)('User no longer exists');
        }
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            department: user.department,
            managerId: user.managerId
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.TokenExpiredError) {
            next((0, errors_1.unauthorized)('Access token expired'));
            return;
        }
        if (error instanceof jsonwebtoken_1.JsonWebTokenError) {
            next((0, errors_1.unauthorized)('Invalid access token'));
            return;
        }
        next(error);
    }
}
