import { Prisma, Role } from '@prisma/client';
import { AuthUser } from '../types/auth';

export function tenantScope(user: Pick<AuthUser, 'tenantId'>) {
  return { tenantId: user.tenantId };
}

export function tenantUserScope(user: Pick<AuthUser, 'tenantId'>, extra?: Prisma.UserWhereInput): Prisma.UserWhereInput {
  return { tenantId: user.tenantId, ...(extra ?? {}) };
}

export function tenantGoalScope(user: Pick<AuthUser, 'tenantId' | 'role' | 'id'>): Prisma.GoalWhereInput {
  if (user.role === Role.ADMIN) {
    return { tenantId: user.tenantId };
  }

  if (user.role === Role.MANAGER) {
    return {
      tenantId: user.tenantId,
      OR: [{ userId: user.id }, { user: { managerId: user.id, tenantId: user.tenantId } }]
    };
  }

  return { tenantId: user.tenantId, userId: user.id };
}

export function tenantCycleScope(user: Pick<AuthUser, 'tenantId'>, extra?: Prisma.CycleWhereInput): Prisma.CycleWhereInput {
  return { tenantId: user.tenantId, ...(extra ?? {}) };
}

export function tenantAuditScope(user: Pick<AuthUser, 'tenantId'>, extra?: Prisma.AuditLogWhereInput): Prisma.AuditLogWhereInput {
  return { tenantId: user.tenantId, ...(extra ?? {}) };
}
