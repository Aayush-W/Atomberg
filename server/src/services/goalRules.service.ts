import { Goal, GoalStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, forbidden } from '../utils/errors';
import { AuthUser } from '../types/auth';

const activeGoalStatuses: GoalStatus[] = [GoalStatus.DRAFT, GoalStatus.SUBMITTED, GoalStatus.APPROVED, GoalStatus.LOCKED];

export function ensureGoalWeightage(weightage: number): void {
  if (weightage < 10 || weightage > 100) {
    throw badRequest('Goal weightage must be between 10% and 100%', { field: 'weightage' });
  }
}

export async function getActiveCycleOrThrow(tenantId: string, cycleId?: string) {
  const cycle = cycleId
    ? await prisma.cycle.findFirst({ where: { id: cycleId, tenantId } })
    : await prisma.cycle.findFirst({ where: { tenantId, isActive: true }, orderBy: { startDate: 'desc' } });

  if (!cycle) {
    throw badRequest(cycleId ? 'Cycle not found' : 'No active cycle configured');
  }

  return cycle;
}

export async function ensureUserCanAccessGoal(user: AuthUser, goal: Goal): Promise<void> {
  if (goal.tenantId !== user.tenantId) {
    throw forbidden('You can only access goals in your tenant');
  }
  if (user.role === Role.ADMIN || goal.userId === user.id) {
    return;
  }

  if (user.role === Role.MANAGER) {
    const owner = await prisma.user.findUnique({ where: { id: goal.userId } });
    if (owner?.managerId === user.id) {
      return;
    }
  }

  throw forbidden('You can only access goals in your reporting scope');
}

export async function ensureManagerCanActOnGoal(user: AuthUser, goal: Goal): Promise<void> {
  if (goal.tenantId !== user.tenantId) {
    throw forbidden('Only managers in the same tenant can perform this action');
  }
  if (user.role === Role.ADMIN) {
    return;
  }

  if (user.role === Role.MANAGER) {
    const owner = await prisma.user.findUnique({ where: { id: goal.userId } });
    if (owner?.managerId === user.id) {
      return;
    }

    const delegation = owner?.managerId
      ? await prisma.approvalDelegation.findFirst({
          where: {
            delegatorManagerId: owner.managerId,
            delegateManagerId: user.id,
            tenantId: user.tenantId,
            isActive: true,
            startsAt: { lte: new Date() },
            endsAt: { gte: new Date() }
          }
        })
      : null;
    if (delegation) {
      return;
    }
  }

  throw forbidden('Only the employee manager or admin can perform this action');
}

export async function ensureCanPushSharedGoal(user: AuthUser, employeeIds: string[]): Promise<void> {
  if (user.role === Role.ADMIN) {
    return;
  }

  if (user.role !== Role.MANAGER) {
    throw forbidden('Only managers and admins can push shared goals');
  }

  const reportees = await prisma.user.count({
    where: {
      id: { in: employeeIds },
      tenantId: user.tenantId,
      managerId: user.id
    }
  });

  if (reportees !== employeeIds.length) {
    throw forbidden('Managers can only push shared goals to their direct reportees');
  }
}

export async function ensureGoalPortfolioLimits(userId: string, cycleId: string, nextGoal?: { id?: string; weightage: number }): Promise<void> {
  ensureGoalWeightage(nextGoal?.weightage ?? 10);

  const goals = await prisma.goal.findMany({
    where: {
      userId,
      cycleId,
      status: { in: activeGoalStatuses },
      ...(nextGoal?.id ? { id: { not: nextGoal.id } } : {})
    },
    select: { weightage: true }
  });

  const goalCount = goals.length + (nextGoal ? 1 : 0);
  if (goalCount > 8) {
    throw badRequest('Employees can have a maximum of 8 active goals per cycle', { field: 'goals' });
  }
}

export async function ensureGoalSheetTotals(userId: string, cycleId: string): Promise<void> {
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      cycleId,
      status: { in: activeGoalStatuses }
    },
    select: { id: true, weightage: true }
  });

  if (goals.length === 0) {
    throw badRequest('At least one goal is required before submission');
  }

  if (goals.length > 8) {
    throw badRequest('Employees can have a maximum of 8 active goals per cycle', { field: 'goals' });
  }

  const invalidGoal = goals.find((goal) => goal.weightage < 10 || goal.weightage > 100);
  if (invalidGoal) {
    throw badRequest('Every goal weightage must be between 10% and 100%', {
      field: 'weightage',
      goalId: invalidGoal.id
    });
  }

  const totalWeightage = goals.reduce((sum, goal) => sum + goal.weightage, 0);
  if (Math.abs(totalWeightage - 100) > 0.001) {
    throw badRequest('Total weightage across active goals must equal 100%', {
      field: 'weightage',
      totalWeightage
    });
  }
}

export async function createAuditLog(data: {
  tenantId?: string;
  goalId: string;
  userId: string;
  action: string;
  field?: string;
  oldValue?: string | null;
  newValue?: string | null;
}): Promise<void> {
  const tenantId =
    data.tenantId ??
    (
      await prisma.goal.findUnique({
        where: { id: data.goalId },
        select: { tenantId: true }
      })
    )?.tenantId;

  if (!tenantId) {
    throw new Error('Unable to resolve tenant for audit log');
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      goalId: data.goalId,
      userId: data.userId,
      action: data.action,
      field: data.field,
      oldValue: data.oldValue,
      newValue: data.newValue
    }
  });
}

export async function auditChangedFields(
  userId: string,
  before: Goal,
  after: Goal,
  fields: Array<keyof Pick<Goal, 'thrustArea' | 'title' | 'description' | 'uomType' | 'target' | 'targetDate' | 'weightage' | 'status' | 'managerComment' | 'lockedAt'>>
): Promise<void> {
  const logs: Prisma.AuditLogCreateManyInput[] = [];

  for (const field of fields) {
    const oldValue = before[field] instanceof Date ? before[field]?.toISOString() : before[field]?.toString() ?? null;
    const newValue = after[field] instanceof Date ? after[field]?.toISOString() : after[field]?.toString() ?? null;
    if (oldValue !== newValue) {
      logs.push({
        tenantId: before.tenantId,
        goalId: before.id,
        userId,
        action: before.lockedAt ? 'POST_LOCK_CHANGE' : 'GOAL_UPDATED',
        field,
        oldValue,
        newValue
      });
    }
  }

  if (logs.length > 0) {
    await prisma.auditLog.createMany({ data: logs });
  }
}
