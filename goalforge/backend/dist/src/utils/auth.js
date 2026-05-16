"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPublicUser = toPublicUser;
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
    return value;
}
function toPublicUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        managerId: user.managerId
    };
}
function signAccessToken(user) {
    const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'access'
    };
    return jsonwebtoken_1.default.sign(payload, requiredEnv('JWT_SECRET'), { expiresIn: ACCESS_TOKEN_TTL });
}
function signRefreshToken(user) {
    const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'refresh'
    };
    return jsonwebtoken_1.default.sign(payload, requiredEnv('JWT_REFRESH_SECRET'), { expiresIn: REFRESH_TOKEN_TTL });
}
function verifyAccessToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, requiredEnv('JWT_SECRET'));
    return assertTokenPayload(decoded, 'access');
}
function verifyRefreshToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, requiredEnv('JWT_REFRESH_SECRET'));
    return assertTokenPayload(decoded, 'refresh');
}
function assertTokenPayload(decoded, type) {
    if (typeof decoded === 'string' ||
        typeof decoded.sub !== 'string' ||
        typeof decoded.email !== 'string' ||
        typeof decoded.role !== 'string' ||
        decoded.type !== type) {
        throw new Error('Invalid token payload');
    }
    return {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        type
    };
}
