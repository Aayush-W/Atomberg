"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIdempotentResponse = getIdempotentResponse;
exports.storeIdempotentResponse = storeIdempotentResponse;
const prisma_1 = require("../lib/prisma");
async function getIdempotentResponse(tenantId, idempotencyKey, routeFingerprint) {
    const existing = await prisma_1.prisma.apiIdempotencyKey.findUnique({
        where: {
            tenantId_idempotencyKey_routeFingerprint: {
                tenantId,
                idempotencyKey,
                routeFingerprint
            }
        }
    });
    if (!existing)
        return null;
    return {
        statusCode: existing.statusCode,
        responseBody: existing.responseBody
    };
}
async function storeIdempotentResponse(args) {
    const ttlHours = args.ttlHours ?? 24;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    return prisma_1.prisma.apiIdempotencyKey.upsert({
        where: {
            tenantId_idempotencyKey_routeFingerprint: {
                tenantId: args.tenantId,
                idempotencyKey: args.idempotencyKey,
                routeFingerprint: args.routeFingerprint
            }
        },
        create: {
            tenantId: args.tenantId,
            idempotencyKey: args.idempotencyKey,
            routeFingerprint: args.routeFingerprint,
            statusCode: args.statusCode,
            responseBody: args.responseBody,
            expiresAt
        },
        update: {
            routeFingerprint: args.routeFingerprint,
            statusCode: args.statusCode,
            responseBody: args.responseBody,
            expiresAt
        }
    });
}
