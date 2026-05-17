import { prisma } from '../lib/prisma';

export async function isFeatureEnabled(tenantId: string, key: string) {
  const flag = await prisma.featureFlag.findUnique({ where: { tenantId_key: { tenantId, key } } });
  return Boolean(flag?.enabled);
}

export async function listFeatureFlags(tenantId: string) {
  return prisma.featureFlag.findMany({ where: { tenantId }, orderBy: { key: 'asc' } });
}

export async function setFeatureFlag(
  tenantId: string,
  key: string,
  enabled: boolean,
  description?: string,
  metadata?: unknown
) {
  return prisma.featureFlag.upsert({
    where: { tenantId_key: { tenantId, key } },
    create: {
      tenantId,
      key,
      enabled,
      description,
      metadata: metadata as any
    },
    update: {
      enabled,
      description,
      metadata: metadata as any
    }
  });
}
