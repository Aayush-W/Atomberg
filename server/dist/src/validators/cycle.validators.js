"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCycleSchema = exports.createCycleSchema = exports.cycleIdParamSchema = void 0;
const zod_1 = require("zod");
const dateString = zod_1.z.string().datetime().transform((value) => new Date(value));
exports.cycleIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid()
});
exports.createCycleSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2),
    startDate: dateString,
    endDate: dateString,
    isActive: zod_1.z.boolean().optional(),
    goalSettingOpen: dateString,
    q1Open: dateString,
    q2Open: dateString,
    q3Open: dateString,
    q4Open: dateString,
    bypassWindow: zod_1.z.boolean().optional()
});
exports.updateCycleSchema = exports.createCycleSchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
});
