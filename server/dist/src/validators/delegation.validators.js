"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDelegationSchema = void 0;
const zod_1 = require("zod");
exports.createDelegationSchema = zod_1.z.object({
    delegatorManagerId: zod_1.z.string().uuid().optional(),
    delegateManagerId: zod_1.z.string().uuid(),
    startsAt: zod_1.z.string().datetime().transform((value) => new Date(value)),
    endsAt: zod_1.z.string().datetime().transform((value) => new Date(value)),
    reason: zod_1.z.string().trim().min(5).max(300)
});
