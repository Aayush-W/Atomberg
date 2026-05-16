"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email().transform((value) => value.toLowerCase()),
    password: zod_1.z.string().min(1, 'Password is required')
});
exports.refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1).optional()
});
