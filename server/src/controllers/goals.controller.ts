import { Goal, GoalStatus, NotificationChannel, Prisma, Role } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthUser } from '../types/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, forbidden, unauthorized } from '../utils/errors';
import { createNotification } from './notifications.controller';
import {
  ApproveGoalInput,
  CreateGoalInput,
  DependencyInput,
  RejectGoalInput,
  SharedGoalInput,
  UpdateGoalInput
} from '../validators/goal.validators';
import {
  auditChangedFields,
  createAuditLog,
  ensureCanPushSharedGoal,
  ensureGoalPortfolioLimits,
  ensureGoalSheetTotals,
  ensureGoalWeightage,
  ensureManagerCanActOnGoal,
  ensureUserCanAccessGoal,
  getActiveCycleOrThrow
} from '../services/goalRules.service';
import { refreshGoalConflictAlerts } from '../services/goalConflict.service';
import { buildAdaptiveGoalApprovalCard } from '../services/teams.service';

const goalInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      managerId: true
    }
  },
  cycle: true,
  checkIns: true,
  kudos: true,
  dependencies: true,
  dependents: true,
  conflictAlertsA: true,
  conflictAlertsB: true
} satisfies Prisma.GoalInclude;

function currentUser(req: { user?: AuthUser }) {
  if (!req.user) {
    throw unauthorized();
  }
  return req.user;
}

async function findGoalOrThrow(id: string): Promise<Goal> {
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) {
    throw badRequest('Goal not found');
  }
  return goal;
}

function ensureGoalEditableByOwner(userId: string, goal: Goal): void {
  if (goal.userId !== userId) {
    throw forbidden('Employees can only edit their own goals');
  }
  if (goal.lockedAt || goal.status === GoalStatus.LOCKED) {
    throw forbidden('Goal is locked. Contact admin to unlock.');
  }
  if (goal.status !== GoalStatus.DRAFT && goal.status !== GoalStatus.REJECTED) {
    throw forbidden('Only draft or rejected goals can be edited before submission');
  }
}

function ensureSharedGoalFieldsCanChange(goal: Goal, body: UpdateGoalInput): void {
  if (!goal.isShared) {
    return;
  }

  const blockedFields: Array<keyof UpdateGoalInput> = ['title', 'description', 'thrustArea', 'uomType', 'target', 'targetDate'];
  const attempted = blockedFields.filter((field) => body[field] !== undefined);
  if (attempted.length > 0) {
    throw forbidden('Shared goal title, description, thrust area, UoM, target, and target date cannot be edited by recipients');
  }
}

function updateGoalData(body: UpdateGoalInput): Prisma.GoalUpdateInput {
  const data: Prisma.GoalUpdateInput = {};
  if (body.thrustArea !== undefined) data.thrustArea = body.thrustArea;
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.uomType !== undefined) data.uomType = body.uomType;
  if (body.target !== undefined) data.target = body.target;
  if (body.targetDate !== undefined) data.targetDate = body.targetDate;
  if (body.weightage !== undefined) data.weightage = body.weightage;
  if (body.sensitivity !== undefined) data.sensitivity = body.sensitivity;
  if (body.qualityScore !== undefined) data.qualityScore = body.qualityScore;
  if (body.qualityFeedback !== undefined) data.qualityFeedback = body.qualityFeedback as Prisma.InputJsonValue;
  return data;
}

async function refreshDepartmentConflictsForGoal(goal: Goal) {
  const owner = await prisma.user.findUnique({
    where: { id: goal.userId },
    select: { department: true }
  });
  if (!owner) {
    return [];
  }

  const departmentGoals = await prisma.goal.findMany({
    where: {
      cycleId: goal.cycleId,
      status: { in: [GoalStatus.SUBMITTED, GoalStatus.APPROVED, GoalStatus.LOCKED] },
      user: { department: owner.department }
    },
    select: {
      id: true,
      cycleId: true,
      title: true,
      description: true,
      thrustArea: true,
      target: true,
      uomType: true,
      weightage: true,
      user: { select: { department: true } }
    }
  });

  return refreshGoalConflictAlerts(departmentGoals);
}

export const listOwnGoals = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const cycle = await prisma.cycle.findFirst({ where: { isActive: true }, orderBy: { startDate: 'desc' } });
  if (!cycle) {
    return res.json({ goals: [] });
  }
  const goals = await prisma.goal.findMany({
    where: { userId: user.id, cycleId: cycle.id },
    include: goalInclude,
    orderBy: { createdAt: 'asc' }
  });

  res.json({ goals });
});

export const listTeamGoals = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
    throw forbidden('Only managers and admins can view team goals');
  }

  const goals = await prisma.goal.findMany({
    where: user.role === Role.ADMIN ? undefined : { user: { managerId: user.id } },
    include: goalInclude,
    orderBy: [{ user: { name: 'asc' } }, { createdAt: 'asc' }]
  });
  res.json({ goals });
});

export const listAllGoals = asyncHandler(async (_req: Request, res: Response) => {
  const goals = await prisma.goal.findMany({
    include: goalInclude,
    orderBy: [{ user: { department: 'asc' } }, { user: { name: 'asc' } }, { createdAt: 'asc' }]
  });
  res.json({ goals });
});

export const createGoal = asyncHandler(async (req: Request<unknown, unknown, CreateGoalInput>, res: Response) => {
  const user = currentUser(req);
  if (user.role !== Role.EMPLOYEE) {
    throw forbidden('Only employees can create their own goals');
  }

  const cycle = await getActiveCycleOrThrow(req.body.cycleId);
  ensureGoalWeightage(req.body.weightage);
  await ensureGoalPortfolioLimits(user.id, cycle.id, { weightage: req.body.weightage });

  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      cycleId: cycle.id,
      thrustArea: req.body.thrustArea,
      title: req.body.title,
      description: req.body.description,
      uomType: req.body.uomType,
      target: req.body.target,
      targetDate: req.body.targetDate,
      weightage: req.body.weightage,
      sensitivity: req.body.sensitivity,
      qualityScore: req.body.qualityScore,
      qualityFeedback: req.body.qualityFeedback as Prisma.InputJsonValue | undefined
    },
    include: goalInclude
  });

  await createAuditLog({ goalId: goal.id, userId: user.id, action: 'GOAL_CREATED' });
  res.status(201).json({ goal });
});

export const updateGoal = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateGoalInput>, res: Response) => {
  const user = currentUser(req);
  const before = await findGoalOrThrow(req.params.id);
  ensureGoalEditableByOwner(user.id, before);
  ensureSharedGoalFieldsCanChange(before, req.body);

  if (req.body.weightage !== undefined) {
    await ensureGoalPortfolioLimits(before.userId, before.cycleId, { id: before.id, weightage: req.body.weightage });
  }

  const after = await prisma.goal.update({
    where: { id: before.id },
    data: updateGoalData(req.body),
    include: goalInclude
  });

  await auditChangedFields(user.id, before, after, [
    'thrustArea',
    'title',
    'description',
    'uomType',
    'target',
    'targetDate',
    'weightage'
  ]);

  res.json({ goal: after });
});

export const deleteGoal = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const user = currentUser(req);
  const goal = await findGoalOrThrow(req.params.id);
  if (goal.userId !== user.id) {
    throw forbidden('Employees can only delete their own goals');
  }
  if (goal.status !== GoalStatus.DRAFT) {
    throw forbidden('Only draft goals can be deleted');
  }

  await prisma.goal.delete({ where: { id: goal.id } });
  res.status(204).send();
});

export const submitGoal = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const user = currentUser(req);
  const before = await findGoalOrThrow(req.params.id);
  ensureGoalEditableByOwner(user.id, before);
  await ensureGoalSheetTotals(before.userId, before.cycleId);

  const goal = await prisma.goal.update({
    where: { id: before.id },
    data: { status: GoalStatus.SUBMITTED },
    include: goalInclude
  });

  await createAuditLog({
    goalId: goal.id,
    userId: user.id,
    action: 'GOAL_SUBMITTED',
    field: 'status',
    oldValue: before.status,
    newValue: GoalStatus.SUBMITTED
  });

  await refreshDepartmentConflictsForGoal(goal);

  if (goal.user.managerId) {
    const card = buildAdaptiveGoalApprovalCard(goal as any, goal.user.managerId);
    await createNotification(
      goal.user.managerId,
      'APPROVAL_PENDING',
      `${goal.user.name} submitted goals for approval`,
      `Review ${goal.user.name}'s goal "${goal.title}" and approve or reject it from the Teams preview.`,
      NotificationChannel.TEAMS,
      {
        goalId: goal.id,
        employeeId: goal.user.id,
        adaptiveCard: card
      }
    );
  }

  res.json({ goal });
});

export const approveGoal = asyncHandler(async (req: Request<{ id: string }, unknown, ApproveGoalInput>, res: Response) => {
  const user = currentUser(req);
  const before = await findGoalOrThrow(req.params.id);
  await ensureManagerCanActOnGoal(user, before);
  if (before.status !== GoalStatus.SUBMITTED && before.status !== GoalStatus.APPROVED) {
    throw badRequest('Only submitted goals can be approved');
  }

  await ensureGoalSheetTotals(before.userId, before.cycleId);
  const goal = await prisma.goal.update({
    where: { id: before.id },
    data: {
      status: GoalStatus.LOCKED,
      lockedAt: new Date(),
      managerComment: req.body.comment
    },
    include: goalInclude
  });

  await auditChangedFields(user.id, before, goal, ['status', 'lockedAt', 'managerComment']);
  await refreshDepartmentConflictsForGoal(goal);
  res.json({ goal });
});

export const rejectGoal = asyncHandler(async (req: Request<{ id: string }, unknown, RejectGoalInput>, res: Response) => {
  const user = currentUser(req);
  const before = await findGoalOrThrow(req.params.id);
  await ensureManagerCanActOnGoal(user, before);
  if (before.status !== GoalStatus.SUBMITTED) {
    throw badRequest('Only submitted goals can be rejected');
  }

  const goal = await prisma.goal.update({
    where: { id: before.id },
    data: {
      status: GoalStatus.REJECTED,
      managerComment: req.body.comment,
      lockedAt: null
    },
    include: goalInclude
  });

  await auditChangedFields(user.id, before, goal, ['status', 'managerComment', 'lockedAt']);
  await refreshDepartmentConflictsForGoal(goal);
  res.json({ goal });
});

export const unlockGoal = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const user = currentUser(req);
  const before = await findGoalOrThrow(req.params.id);
  const goal = await prisma.goal.update({
    where: { id: before.id },
    data: {
      status: GoalStatus.APPROVED,
      lockedAt: null
    },
    include: goalInclude
  });

  await auditChangedFields(user.id, before, goal, ['status', 'lockedAt']);
  res.json({ goal });
});

export const createSharedGoal = asyncHandler(async (req: Request<unknown, unknown, SharedGoalInput>, res: Response) => {
  const user = currentUser(req);
  const uniqueEmployeeIds = [...new Set(req.body.employeeIds)];
  await ensureCanPushSharedGoal(user, uniqueEmployeeIds);
  const cycle = await getActiveCycleOrThrow(req.body.cycleId);

  const employees = await prisma.user.findMany({
    where: { id: { in: uniqueEmployeeIds }, role: Role.EMPLOYEE },
    select: { id: true }
  });
  if (employees.length !== uniqueEmployeeIds.length) {
    throw badRequest('All shared goal recipients must be valid employees');
  }

  await Promise.all(
    uniqueEmployeeIds.map((employeeId) =>
      ensureGoalPortfolioLimits(employeeId, cycle.id, { weightage: req.body.weightage })
    )
  );

  const [primaryEmployeeId, ...childEmployeeIds] = uniqueEmployeeIds;
  const parentGoal = await prisma.goal.create({
    data: {
      userId: primaryEmployeeId,
      cycleId: cycle.id,
      thrustArea: req.body.thrustArea,
      title: req.body.title,
      description: req.body.description,
      uomType: req.body.uomType,
      target: req.body.target,
      targetDate: req.body.targetDate,
      weightage: req.body.weightage,
      isShared: false,
      sensitivity: req.body.sensitivity,
      qualityScore: req.body.qualityScore,
      qualityFeedback: req.body.qualityFeedback as Prisma.InputJsonValue | undefined
    }
  });

  const childGoals = await Promise.all(
    childEmployeeIds.map((employeeId) =>
      prisma.goal.create({
        data: {
          userId: employeeId,
          cycleId: cycle.id,
          thrustArea: req.body.thrustArea,
          title: req.body.title,
          description: req.body.description,
          uomType: req.body.uomType,
          target: req.body.target,
          targetDate: req.body.targetDate,
          weightage: req.body.weightage,
          isShared: true,
          parentGoalId: parentGoal.id,
          sensitivity: req.body.sensitivity,
          qualityScore: req.body.qualityScore,
          qualityFeedback: req.body.qualityFeedback as Prisma.InputJsonValue | undefined
        }
      })
    )
  );

  await createAuditLog({ goalId: parentGoal.id, userId: user.id, action: 'SHARED_GOAL_CREATED' });
  await Promise.all(childGoals.map((goal) => createAuditLog({ goalId: goal.id, userId: user.id, action: 'SHARED_GOAL_CREATED' })));

  const goals = await prisma.goal.findMany({
    where: { id: { in: [parentGoal.id, ...childGoals.map((goal) => goal.id)] } },
    include: goalInclude
  });

  res.status(201).json({ goals });
});

export const getGoalAudit = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const user = currentUser(req);
  const goal = await findGoalOrThrow(req.params.id);
  await ensureUserCanAccessGoal(user, goal);

  const auditLogs = await prisma.auditLog.findMany({
    where: { goalId: goal.id },
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
    orderBy: { timestamp: 'desc' }
  });
  res.json({ auditLogs });
});

export const getDependencyGraph = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const where: Prisma.GoalWhereInput =
    user.role === Role.ADMIN
      ? {}
      : user.role === Role.MANAGER
        ? { user: { managerId: user.id } }
        : { userId: user.id };

  const goals = await prisma.goal.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, department: true, managerId: true } },
      checkIns: true,
      dependencies: true,
      dependents: true
    },
    orderBy: [{ user: { name: 'asc' } }, { createdAt: 'asc' }]
  });

  const goalIds = goals.map((goal) => goal.id);
  const dependencies = await prisma.goalDependency.findMany({
    where: {
      dependentGoalId: { in: goalIds },
      requiredGoalId: { in: goalIds }
    }
  });

  res.json({
    goals: goals.map((goal) => ({
      ...goal,
      progressScore: goal.checkIns.at(-1)?.progressScore ?? 0
    })),
    dependencies
  });
});

export const addDependency = asyncHandler(async (req: Request<{ id: string }, unknown, DependencyInput>, res: Response) => {
  const user = currentUser(req);
  const dependentGoal = await findGoalOrThrow(req.params.id);
  const requiredGoal = await findGoalOrThrow(req.body.requiredGoalId);
  await ensureUserCanAccessGoal(user, dependentGoal);
  await ensureUserCanAccessGoal(user, requiredGoal);

  if (dependentGoal.id === requiredGoal.id) {
    throw badRequest('A goal cannot depend on itself');
  }

  const dependency = await prisma.goalDependency.create({
    data: {
      dependentGoalId: dependentGoal.id,
      requiredGoalId: requiredGoal.id
    }
  });

  await createAuditLog({
    goalId: dependentGoal.id,
    userId: user.id,
    action: 'DEPENDENCY_ADDED',
    field: 'requiredGoalId',
    newValue: requiredGoal.id
  });

  res.status(201).json({ dependency });
});

export const importGoalPortfolio = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  if (user.role !== Role.EMPLOYEE) {
    throw forbidden('Only employees can import their own portfolio');
  }

  const goals = Array.isArray(req.body.goals) ? (req.body.goals as CreateGoalInput[]) : [];
  if (goals.length !== 5) {
    throw badRequest('Portfolio import expects exactly 5 goals');
  }

  const cycle = await getActiveCycleOrThrow(req.body.cycleId);
  const existing = await prisma.goal.findMany({
    where: { userId: user.id, cycleId: cycle.id }
  });

  if (existing.some((goal) => goal.status !== GoalStatus.DRAFT && goal.status !== GoalStatus.REJECTED)) {
    throw badRequest('Portfolio import is only available before any goals are submitted or approved');
  }

  const totalWeightage = goals.reduce((sum, goal) => sum + goal.weightage, 0);
  if (Math.abs(totalWeightage - 100) > 0.001) {
    throw badRequest('Imported goals must sum to exactly 100% weightage');
  }

  await prisma.$transaction(async (tx) => {
    await tx.goal.deleteMany({
      where: { userId: user.id, cycleId: cycle.id, status: { in: [GoalStatus.DRAFT, GoalStatus.REJECTED] } }
    });

    for (const goal of goals) {
      ensureGoalWeightage(goal.weightage);
      await tx.goal.create({
        data: {
          userId: user.id,
          cycleId: cycle.id,
          thrustArea: goal.thrustArea,
          title: goal.title,
          description: goal.description,
          uomType: goal.uomType,
          target: goal.target,
          targetDate: goal.targetDate,
          weightage: goal.weightage,
          sensitivity: goal.sensitivity,
          qualityFeedback: {
            source: 'goal-autopilot',
            rationale: (goal as unknown as { rationale?: string }).rationale ?? null
          }
        }
      });
    }
  });

  const importedGoals = await prisma.goal.findMany({
    where: { userId: user.id, cycleId: cycle.id },
    include: goalInclude,
    orderBy: { createdAt: 'asc' }
  });

  res.status(201).json({ goals: importedGoals });
});

export const getGoal = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const user = currentUser(req);
  const goal = await findGoalOrThrow(req.params.id);
  await ensureUserCanAccessGoal(user, goal);
  res.json({ goal });
});
