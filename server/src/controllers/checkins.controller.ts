import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, forbidden, unauthorized } from '../utils/errors';
import { CreateCheckInInput, UpdateCheckInInput } from '../validators/checkin.validators';
import { currentUser as getCurrentUser } from './_helpers';
import { ensureUserCanAccessGoal, createAuditLog, getActiveCycleOrThrow } from '../services/goalRules.service';
import { cycleStatus } from '../services/cycleRules.service';
import { calculateSentimentScore } from '../services/sentiment.service';
import { computeProgress } from '../services/checkinProgress.service';
import { emitDomainEvent } from '../services/domainEvent.service';

export const createCheckIn = asyncHandler(async (req: Request<unknown, unknown, CreateCheckInInput>, res: Response) => {
  const user = getCurrentUser(req as any);
  if (!user) throw unauthorized();

  const goal = await prisma.goal.findUnique({ where: { id: req.body.goalId } });
  if (!goal) throw badRequest('Goal not found');

  await ensureUserCanAccessGoal(user, goal);
  if (user.role === 'EMPLOYEE' && goal.userId !== user.id) {
    throw forbidden('Employees can only create check-ins for their own goals');
  }

  if (goal.isShared && goal.parentGoalId !== null && user.role === 'EMPLOYEE') {
    throw forbidden('Employees cannot directly create check-ins for shared child goals');
  }

  const cycle = await getActiveCycleOrThrow(user.tenantId, goal.cycleId);
  const cycleStatusObj = cycleStatus(cycle as any);
  const qStatus = cycleStatusObj.checkIns[req.body.quarter];
  if (!qStatus || !qStatus.isOpen) {
    throw badRequest(`Check-in window for ${req.body.quarter} is closed`);
  }

  const progress = computeProgress(goal as any, req.body as any);

  const checkIn = await prisma.checkIn.create({
    data: {
      tenantId: goal.tenantId,
      goalId: req.body.goalId,
      userId: user.id,
      quarter: req.body.quarter,
      actualValue: req.body.actualValue,
      completionDate: req.body.completionDate ?? null,
      status: req.body.status ?? 'ON_TRACK',
      progressScore: progress,
      employeeNote: req.body.employeeNote ?? null,
      sentiment: calculateSentimentScore([req.body.employeeNote])
    }
  });

  await createAuditLog({ goalId: goal.id, userId: user.id, action: 'CHECKIN_CREATED' });
  await emitDomainEvent({
    tenantId: user.tenantId,
    eventName: 'checkin.created',
    aggregateType: 'goal',
    aggregateId: goal.id,
    payload: {
      goalId: goal.id,
      checkInId: checkIn.id,
      actorUserId: user.id,
      progressScore: checkIn.progressScore,
      quarter: checkIn.quarter
    }
  });

  if (goal.isShared && goal.parentGoalId === null) {
    const childGoals = await prisma.goal.findMany({ where: { parentGoalId: goal.id } });
    if (childGoals.length > 0) {
      await prisma.checkIn.createMany({
        data: childGoals.map(cg => ({
          tenantId: goal.tenantId,
          goalId: cg.id,
          userId: cg.userId,
          quarter: req.body.quarter,
          actualValue: req.body.actualValue,
          completionDate: req.body.completionDate ?? null,
          status: req.body.status ?? 'ON_TRACK',
          progressScore: progress,
          employeeNote: req.body.employeeNote ?? null,
          sentiment: calculateSentimentScore([req.body.employeeNote])
        }))
      });
      await prisma.auditLog.createMany({
        data: childGoals.map(cg => ({
          tenantId: goal.tenantId,
          goalId: cg.id,
          userId: user.id,
          action: 'CHECKIN_SYNCED'
        }))
      });
    }
  }

  res.status(201).json({ checkIn });
});

export const listGoalCheckIns = asyncHandler(async (req: Request<{ goalId: string }>, res: Response) => {
  const user = getCurrentUser(req as any);
  if (!user) throw unauthorized();

  const goal = await prisma.goal.findUnique({ where: { id: req.params.goalId } });
  if (!goal) throw badRequest('Goal not found');

  await ensureUserCanAccessGoal(user, goal);

  const checkIns = await prisma.checkIn.findMany({ where: { tenantId: user.tenantId, goalId: goal.id }, orderBy: { createdAt: 'asc' } });
  res.json({ checkIns });
});

export const getCheckIn = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const user = getCurrentUser(req as any);
  if (!user) throw unauthorized();

  const checkIn = await prisma.checkIn.findUnique({ where: { id: req.params.id } });
  if (!checkIn) throw badRequest('Check-in not found');

  const goal = await prisma.goal.findUnique({ where: { id: checkIn.goalId } });
  if (!goal) throw badRequest('Associated goal not found');

  await ensureUserCanAccessGoal(user, goal);
  res.json({ checkIn });
});

export const updateCheckIn = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateCheckInInput>, res: Response) => {
  const user = getCurrentUser(req as any);
  if (!user) throw unauthorized();

  const existing = await prisma.checkIn.findUnique({ where: { id: req.params.id } });
  if (!existing) throw badRequest('Check-in not found');

  const goal = await prisma.goal.findUnique({ where: { id: existing.goalId } });
  if (!goal) throw badRequest('Associated goal not found');

  await ensureUserCanAccessGoal(user, goal);

  if (goal.isShared && goal.parentGoalId !== null && user.role === 'EMPLOYEE') {
    throw forbidden('Employees cannot directly update check-ins for shared child goals');
  }

  const cycle = await getActiveCycleOrThrow(user.tenantId, goal.cycleId);
  const cycleStatusObj = cycleStatus(cycle as any);
  const qStatus = cycleStatusObj.checkIns[existing.quarter];
  if (!qStatus || !qStatus.isOpen) {
    throw badRequest(`Check-in window for ${existing.quarter} is closed`);
  }

  // Only managers/admins can add manager comments
  if (req.body.managerComment && user.role === 'EMPLOYEE') {
    throw forbidden('Only managers or admins can add manager comments');
  }

  const toUpdate: Prisma.CheckInUpdateInput = {};
  if (req.body.actualValue !== undefined) toUpdate.actualValue = req.body.actualValue;
  if (req.body.completionDate !== undefined) toUpdate.completionDate = req.body.completionDate as any;
  if (req.body.status !== undefined) toUpdate.status = req.body.status as any;
  if (req.body.employeeNote !== undefined) {
    toUpdate.employeeNote = req.body.employeeNote as any;
  }
  if (req.body.managerComment !== undefined) {
    toUpdate.managerComment = req.body.managerComment as any;
    toUpdate.managerCheckedAt = new Date();
  }

  // recompute progress if numeric fields changed
  const progress = computeProgress(goal as any, { ...existing, ...(req.body as any) });
  toUpdate.progressScore = progress as any;
  toUpdate.sentiment = calculateSentimentScore([
    req.body.employeeNote ?? existing.employeeNote,
    req.body.managerComment ?? existing.managerComment
  ]) as any;

  const updated = await prisma.checkIn.update({ where: { id: existing.id }, data: toUpdate });
  await createAuditLog({ goalId: goal.id, userId: user.id, action: 'CHECKIN_UPDATED' });
  await emitDomainEvent({
    tenantId: user.tenantId,
    eventName: 'checkin.updated',
    aggregateType: 'goal',
    aggregateId: goal.id,
    payload: {
      goalId: goal.id,
      checkInId: updated.id,
      actorUserId: user.id,
      progressScore: updated.progressScore,
      quarter: updated.quarter
    }
  });

  if (goal.isShared && goal.parentGoalId === null) {
    const childGoals = await prisma.goal.findMany({ where: { parentGoalId: goal.id } });
    if (childGoals.length > 0) {
      await prisma.checkIn.updateMany({
        where: {
          goalId: { in: childGoals.map(cg => cg.id) },
          quarter: existing.quarter
        },
        data: {
          actualValue: toUpdate.actualValue,
          completionDate: toUpdate.completionDate,
          status: toUpdate.status,
          progressScore: toUpdate.progressScore,
          employeeNote: toUpdate.employeeNote,
          sentiment: toUpdate.sentiment
        }
      });
      await prisma.auditLog.createMany({
        data: childGoals.map(cg => ({
          tenantId: goal.tenantId,
          goalId: cg.id,
          userId: user.id,
          action: 'CHECKIN_SYNCED'
        }))
      });
    }
  }

  res.json({ checkIn: updated });
});

export const deleteCheckIn = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const user = getCurrentUser(req as any);
  if (!user) throw unauthorized();

  const checkIn = await prisma.checkIn.findUnique({ where: { id: req.params.id } });
  if (!checkIn) throw badRequest('Check-in not found');

  const goal = await prisma.goal.findUnique({ where: { id: checkIn.goalId } });
  if (!goal) throw badRequest('Associated goal not found');

  await ensureUserCanAccessGoal(user, goal);

  if (user.role === 'EMPLOYEE' && checkIn.userId !== user.id) {
    throw forbidden('Employees can only delete their own check-ins');
  }

  if (goal.isShared && goal.parentGoalId !== null && user.role === 'EMPLOYEE') {
    throw forbidden('Employees cannot directly delete check-ins for shared child goals');
  }

  const cycle = await getActiveCycleOrThrow(user.tenantId, goal.cycleId);
  const cycleStatusObj = cycleStatus(cycle as any);
  const qStatus = cycleStatusObj.checkIns[checkIn.quarter];
  if (!qStatus || !qStatus.isOpen) {
    throw badRequest(`Check-in window for ${checkIn.quarter} is closed`);
  }

  await prisma.checkIn.delete({ where: { id: checkIn.id } });
  await createAuditLog({ goalId: goal.id, userId: user.id, action: 'CHECKIN_DELETED' });
  await emitDomainEvent({
    tenantId: user.tenantId,
    eventName: 'checkin.deleted',
    aggregateType: 'goal',
    aggregateId: goal.id,
    payload: {
      goalId: goal.id,
      checkInId: checkIn.id,
      actorUserId: user.id,
      quarter: checkIn.quarter
    }
  });

  if (goal.isShared && goal.parentGoalId === null) {
    const childGoals = await prisma.goal.findMany({ where: { parentGoalId: goal.id } });
    if (childGoals.length > 0) {
      await prisma.checkIn.deleteMany({
        where: {
          goalId: { in: childGoals.map(cg => cg.id) },
          quarter: checkIn.quarter
        }
      });
      await prisma.auditLog.createMany({
        data: childGoals.map(cg => ({
          tenantId: goal.tenantId,
          goalId: cg.id,
          userId: user.id,
          action: 'CHECKIN_SYNCED_DELETE'
        }))
      });
    }
  }

  res.status(204).send();
});
