"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.createUserSchema = exports.managerIdParamSchema = exports.idParamSchema = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
exports.idParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid()
});
exports.managerIdParamSchema = zod_1.z.object({
    managerId: zod_1.z.string().uuid()
});
exports.createUserSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2),
    email: zod_1.z.string().trim().email().transform((value) => value.toLowerCase()),
    password: zod_1.z.string().min(8),
    role: zod_1.z.nativeEnum(client_1.Role),
    department: zod_1.z.string().trim().min(2),
    managerId: zod_1.z.string().uuid().nullable().optional()
});
exports.updateUserSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(2).optional(),
    email: zod_1.z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
    password: zod_1.z.string().min(8).optional(),
    role: zod_1.z.nativeEnum(client_1.Role).optional(),
    department: zod_1.z.string().trim().min(2).optional(),
    managerId: zod_1.z.string().uuid().nullable().optional()
})
    .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
});
