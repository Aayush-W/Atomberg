import { Prisma, Goal, UoMType } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, forbidden, unauthorized } from '../utils/errors';
import { CreateCheckInInput, UpdateCheckInInput } from '../validators/checkin.validators';
import { currentUser as getCurrentUser } from './_helpers';
import { ensureUserCanAccessGoal, createAuditLog } from '../services/goalRules.service';

function computeProgress(goal: Goal & { target: number | null; targetDate?: Date | null }, input: Partial<CreateCheckInInput & UpdateCheckInInput>) {
  const uom = goal.uomType as UoMType;
  const actual = typeof input.actualValue === 'number' ? input.actualValue : 0;

  if (uom === UoMType.MAX) {
    if (!goal.target || goal.target === 0) return 0;
    return Math.min(100, (actual / goal.target) * 100);
  }

  if (uom === UoMType.MIN) {
    if (!goal.target || goal.target === 0) return 0;
    // lower is better: if actual <= target -> 100, else degrade
    if (actual <= goal.target) return 100;
    const ratio = Math.max(0, 1 - (actual - goal.target) / goal.target);
    return Math.round(Math.max(0, ratio * 100));
  }

  if (uom === UoMType.TIMELINE) {
    const completion = (input as any).completionDate as Date | undefined | null;
    if (!goal.targetDate) return 0;
    if (!completion) return 0;
    const diff = Math.floor((goal.targetDate.getTime() - completion.getTime()) / (1000 * 60 * 60 * 24));
    // on-time or early => 100, late decreases by 2 points per day late
    if (diff >= 0) return 100;
    return Math.max(0, 100 + diff * 2); // diff is negative when late
  }

  // ZERO (binary) or fallback
  if (uom === UoMType.ZERO) {
    return actual > 0 ? 100 : 0;
  }

  return 0;
}

export const createCheckIn = asyncHandler(async (req: Request<unknown, unknown, CreateCheckInInput>, res: Response) => {
  const user = getCurrentUser(req as any);
  if (!user) throw unauthorized();

  const goal = await prisma.goal.findUnique({ where: { id: req.body.goalId } });
  if (!goal) throw badRequest('Goal not found');

  await ensureUserCanAccessGoal(user, goal);
  if (user.role === 'EMPLOYEE' && goal.userId !== user.id) {
    throw forbidden('Employees can only create check-ins for their own goals');
  }

  const progress = computeProgress(goal as any, req.body as any);

  const checkIn = await prisma.checkIn.create({
    data: {
      goalId: req.body.goalId,
      userId: user.id,
      quarter: req.body.quarter,
      actualValue: req.body.actualValue,
      completionDate: req.body.completionDate ?? null,
      status: req.body.status ?? 'ON_TRACK',
      progressScore: progress
    }
  });

  await createAuditLog({ goalId: goal.id, userId: user.id, action: 'CHECKIN_CREATED' });

  res.status(201).json({ checkIn });
});

export const listGoalCheckIns = asyncHandler(async (req: Request<{ goalId: string }>, res: Response) => {
  const user = getCurrentUser(req as any);
  if (!user) throw unauthorized();

  const goal = await prisma.goal.findUnique({ where: { id: req.params.goalId } });
  if (!goal) throw badRequest('Goal not found');

  await ensureUserCanAccessGoal(user, goal);

  const checkIns = await prisma.checkIn.findMany({ where: { goalId: goal.id }, orderBy: { createdAt: 'asc' } });
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

  // Only managers/admins can add manager comments
  if (req.body.managerComment && user.role === 'EMPLOYEE') {
    throw forbidden('Only managers or admins can add manager comments');
  }

  const toUpdate: Prisma.CheckInUpdateInput = {};
  if (req.body.actualValue !== undefined) toUpdate.actualValue = req.body.actualValue;
  if (req.body.completionDate !== undefined) toUpdate.completionDate = req.body.completionDate as any;
  if (req.body.status !== undefined) toUpdate.status = req.body.status as any;
  if (req.body.managerComment !== undefined) {
    toUpdate.managerComment = req.body.managerComment as any;
    toUpdate.managerCheckedAt = new Date();
  }

  // recompute progress if numeric fields changed
  const progress = computeProgress(goal as any, { ...existing, ...(req.body as any) });
  toUpdate.progressScore = progress as any;

  const updated = await prisma.checkIn.update({ where: { id: existing.id }, data: toUpdate });
  await createAuditLog({ goalId: goal.id, userId: user.id, action: 'CHECKIN_UPDATED' });

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

  await prisma.checkIn.delete({ where: { id: checkIn.id } });
  await createAuditLog({ goalId: goal.id, userId: user.id, action: 'CHECKIN_DELETED' });

  res.status(204).send();
});
