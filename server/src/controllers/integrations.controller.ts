import { GoalStatus, NotificationChannel, Role } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, forbidden } from '../utils/errors';
import { currentUser } from './_helpers';
import { createNotification } from './notifications.controller';
import { verifySignedDecisionToken } from '../services/teams.service';
import { auditChangedFields, ensureGoalSheetTotals, ensureManagerCanActOnGoal } from '../services/goalRules.service';

export const getTeamsCards = asyncHandler(async (req: Request<{ managerId: string }>, res: Response) => {
  const user = currentUser(req);
  if (user.role !== Role.ADMIN && user.id !== req.params.managerId) {
    throw forbidden('You can only view your own Teams cards');
  }

  const cards = await prisma.notification.findMany({
    where: {
      userId: req.params.managerId,
      channel: NotificationChannel.TEAMS
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  res.json({ cards });
});

export const handleTeamsAction = asyncHandler(async (req: Request<{ decision: string }>, res: Response) => {
  const user = currentUser(req);
  const token = typeof req.body.token === 'string' ? req.body.token : null;
  if (!token) {
    throw badRequest('Signed action token is required');
  }

  const payload = verifySignedDecisionToken(token);
  if (payload.decision !== req.params.decision) {
    throw badRequest('Decision mismatch');
  }
  if (user.role !== Role.ADMIN && user.id !== payload.managerId) {
    throw forbidden('This Teams action is not assigned to you');
  }

  const before = await prisma.goal.findUnique({
    where: { id: payload.goalId },
    include: {
      user: { select: { id: true, name: true, managerId: true } }
    }
  });
  if (!before) {
    throw badRequest('Goal not found');
  }

  await ensureManagerCanActOnGoal(user, before);

  if (payload.decision === 'approve') {
    await ensureGoalSheetTotals(before.userId, before.cycleId);
  }

  const goal = await prisma.goal.update({
    where: { id: before.id },
    data:
      payload.decision === 'approve'
        ? {
            status: GoalStatus.LOCKED,
            lockedAt: new Date(),
            managerComment: req.body.comment ?? 'Approved from Microsoft Teams card'
          }
        : {
            status: GoalStatus.REJECTED,
            lockedAt: null,
            managerComment: req.body.comment ?? 'Rejected from Microsoft Teams card'
          }
  });

  await auditChangedFields(user.id, before, goal, ['status', 'lockedAt', 'managerComment']);
  await createNotification(
    before.user.id,
    payload.decision === 'approve' ? 'TEAMS_APPROVAL' : 'TEAMS_REJECTION',
    payload.decision === 'approve' ? 'Goal approved from Teams' : 'Goal returned from Teams',
    `Your goal "${before.title}" was ${payload.decision === 'approve' ? 'approved' : 'returned for rework'} from Microsoft Teams.`,
    NotificationChannel.IN_APP,
    { goalId: before.id, actorId: user.id }
  );

  res.json({ goal });
});
