"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dependencySchema = exports.sharedGoalSchema = exports.approveGoalSchema = exports.rejectGoalSchema = exports.updateGoalSchema = exports.createGoalSchema = exports.goalIdParamSchema = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const optionalDateString = zod_1.z
    .string()
    .datetime()
    .transform((value) => new Date(value))
    .nullable()
    .optional();
exports.goalIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid()
});
exports.createGoalSchema = zod_1.z.object({
    cycleId: zod_1.z.string().uuid().optional(),
    thrustArea: zod_1.z.string().trim().min(2),
    title: zod_1.z.string().trim().min(3),
    description: zod_1.z.string().trim().min(10),
    uomType: zod_1.z.nativeEnum(client_1.UoMType),
    target: zod_1.z.number().finite(),
    targetDate: optionalDateString,
    weightage: zod_1.z.number().min(10).max(80),
    qualityScore: zod_1.z.number().min(0).max(100).optional(),
    qualityFeedback: zod_1.z.unknown().optional()
});
exports.updateGoalSchema = exports.createGoalSchema
    .omit({ cycleId: true })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
});
exports.rejectGoalSchema = zod_1.z.object({
    comment: zod_1.z.string().trim().min(3)
});
exports.approveGoalSchema = zod_1.z.object({
    comment: zod_1.z.string().trim().optional()
});
exports.sharedGoalSchema = zod_1.z.object({
    employeeIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
    cycleId: zod_1.z.string().uuid().optional(),
    thrustArea: zod_1.z.string().trim().min(2),
    title: zod_1.z.string().trim().min(3),
    description: zod_1.z.string().trim().min(10),
    uomType: zod_1.z.nativeEnum(client_1.UoMType),
    target: zod_1.z.number().finite(),
    targetDate: optionalDateString,
    weightage: zod_1.z.number().min(10).max(80),
    qualityScore: zod_1.z.number().min(0).max(100).optional(),
    qualityFeedback: zod_1.z.unknown().optional()
});
exports.dependencySchema = zod_1.z.object({
    requiredGoalId: zod_1.z.string().uuid()
});
