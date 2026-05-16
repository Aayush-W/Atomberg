"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = exports.logout = exports.refresh = exports.login = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = require("jsonwebtoken");
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const auth_1 = require("../utils/auth");
const errors_1 = require("../utils/errors");
const refreshCookieName = 'goalforge_refresh_token';
function setRefreshCookie(res, refreshToken) {
    res.cookie(refreshCookieName, refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/api/auth/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
}
exports.login = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user) {
        throw (0, errors_1.unauthorized)('Invalid email or password');
    }
    const isPasswordValid = await bcrypt_1.default.compare(req.body.password, user.password);
    if (!isPasswordValid) {
        throw (0, errors_1.unauthorized)('Invalid email or password');
    }
    const publicUser = (0, auth_1.toPublicUser)(user);
    const accessToken = (0, auth_1.signAccessToken)(publicUser);
    const refreshToken = (0, auth_1.signRefreshToken)(publicUser);
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, refreshToken, user: publicUser });
});
exports.refresh = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const token = req.body.refreshToken ?? req.cookies?.[refreshCookieName];
    if (!token) {
        throw (0, errors_1.unauthorized)('Refresh token required');
    }
    try {
        const payload = (0, auth_1.verifyRefreshToken)(token);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user) {
            throw (0, errors_1.unauthorized)('User no longer exists');
        }
        const accessToken = (0, auth_1.signAccessToken)((0, auth_1.toPublicUser)(user));
        res.json({ accessToken });
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.TokenExpiredError) {
            throw (0, errors_1.unauthorized)('Refresh token expired');
        }
        if (error instanceof jsonwebtoken_1.JsonWebTokenError) {
            throw (0, errors_1.unauthorized)('Invalid refresh token');
        }
        throw error;
    }
});
exports.logout = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    res.clearCookie(refreshCookieName, { path: '/api/auth/refresh' });
    res.status(204).send();
});
exports.me = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw (0, errors_1.unauthorized)();
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
        throw (0, errors_1.unauthorized)('User no longer exists');
    }
    res.json({ user: (0, auth_1.toPublicUser)(user) });
});
