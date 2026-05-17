"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFeatureEnabled = isFeatureEnabled;
exports.listFeatureFlags = listFeatureFlags;
exports.setFeatureFlag = setFeatureFlag;
const prisma_1 = require("../lib/prisma");
async function isFeatureEnabled(tenantId, key) {
    const flag = await prisma_1.prisma.featureFlag.findUnique({ where: { tenantId_key: { tenantId, key } } });
    return Boolean(flag?.enabled);
}
async function listFeatureFlags(tenantId) {
    return prisma_1.prisma.featureFlag.findMany({ where: { tenantId }, orderBy: { key: 'asc' } });
}
async function setFeatureFlag(tenantId, key, enabled, description, metadata) {
    return prisma_1.prisma.featureFlag.upsert({
        where: { tenantId_key: { tenantId, key } },
        create: {
            tenantId,
            key,
            enabled,
            description,
            metadata: metadata
        },
        update: {
            enabled,
            description,
            metadata: metadata
        }
    });
}
