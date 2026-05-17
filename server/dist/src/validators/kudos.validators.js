"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createKudosSchema = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
exports.createKudosSchema = zod_1.z.object({
    receiverId: zod_1.z.string().uuid(),
    goalId: zod_1.z.string().uuid().optional(),
    badgeType: zod_1.z.nativeEnum(client_1.KudosBadgeType),
    note: zod_1.z.string().trim().min(3).max(300)
});
