"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCheckInSchema = exports.createCheckInSchema = exports.checkInIdParamSchema = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const optionalDateString = zod_1.z
    .string()
    .datetime()
    .transform((value) => new Date(value))
    .nullable()
    .optional();
exports.checkInIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid()
});
exports.createCheckInSchema = zod_1.z.object({
    goalId: zod_1.z.string().uuid(),
    quarter: zod_1.z.nativeEnum(client_1.Quarter),
    actualValue: zod_1.z.number().finite(),
    completionDate: optionalDateString,
    status: zod_1.z.nativeEnum(client_1.CheckInStatus).optional(),
    employeeNote: zod_1.z.string().trim().min(1).max(1000).optional()
});
exports.updateCheckInSchema = zod_1.z
    .object({
    actualValue: zod_1.z.number().finite().optional(),
    completionDate: optionalDateString,
    status: zod_1.z.nativeEnum(client_1.CheckInStatus).optional(),
    employeeNote: zod_1.z.string().trim().min(1).max(1000).optional(),
    managerComment: zod_1.z.string().trim().min(1).optional()
})
    .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });
