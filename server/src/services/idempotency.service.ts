import { prisma } from '../lib/prisma';

export async function getIdempotentResponse(tenantId: string, idempotencyKey: string, routeFingerprint: string) {
  const existing = await prisma.apiIdempotencyKey.findUnique({
    where: {
      tenantId_idempotencyKey_routeFingerprint: {
        tenantId,
        idempotencyKey,
        routeFingerprint
      }
    }
  });
  if (!existing) return null;
  return {
    statusCode: existing.statusCode,
    responseBody: existing.responseBody
  };
}

export async function storeIdempotentResponse(args: {
  tenantId: string;
  idempotencyKey: string;
  routeFingerprint: string;
  statusCode: number;
  responseBody: unknown;
  ttlHours?: number;
}) {
  const ttlHours = args.ttlHours ?? 24;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  return prisma.apiIdempotencyKey.upsert({
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
      responseBody: args.responseBody as any,
      expiresAt
    },
    update: {
      routeFingerprint: args.routeFingerprint,
      statusCode: args.statusCode,
      responseBody: args.responseBody as any,
      expiresAt
    }
  });
}
