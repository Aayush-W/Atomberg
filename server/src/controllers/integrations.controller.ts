import { CheckInStatus, GoalStatus, NotificationChannel, Prisma, Quarter, Role } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, forbidden } from '../utils/errors';
import { currentUser } from './_helpers';
import { createNotification } from './notifications.controller';
import { verifySignedDecisionToken } from '../services/teams.service';
import { auditChangedFields, ensureGoalSheetTotals, ensureManagerCanActOnGoal } from '../services/goalRules.service';
import { applyGoalProgressSync, buildChatOpsReply } from '../services/integration.service';
import { computeProgress, deriveCheckInStatus, quarterFromDate } from '../services/checkinProgress.service';
import { parseChatOpsCommand } from '../services/ai.service';

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

function readWebhookSecret(req: Request) {
  return req.header('x-goalforge-webhook-secret') ?? req.header('x-webhook-secret') ?? '';
}

function parseQuarter(value: unknown): Quarter | undefined {
  if (value === 'Q1' || value === 'Q2' || value === 'Q3' || value === 'Q4') return value;
  return undefined;
}

async function syncPayloadFromRequest(provider: string, body: Record<string, unknown>, actorUserId?: string) {
  const goalId = typeof body.goalId === 'string' ? body.goalId : null;
  if (!goalId) {
    throw badRequest('goalId is required');
  }

  const incrementBy = typeof body.incrementBy === 'number' ? body.incrementBy : 1;
  const actualValue = typeof body.actualValue === 'number' ? body.actualValue : undefined;
  const status =
    body.status === CheckInStatus.COMPLETED || body.status === CheckInStatus.NOT_STARTED || body.status === CheckInStatus.ON_TRACK
      ? body.status
      : undefined;

  return applyGoalProgressSync({
    provider,
    goalId,
    quarter: parseQuarter(body.quarter),
    incrementBy,
    actualValue,
    status,
    eventTitle: typeof body.eventTitle === 'string' ? body.eventTitle : undefined,
    note: typeof body.note === 'string' ? body.note : undefined,
    actorUserId
  });
}

export const receiveExternalWebhook = asyncHandler(async (req: Request<{ provider: string }>, res: Response) => {
  const configuredSecret = process.env.GOALFORGE_WEBHOOK_SECRET || 'goalforge-demo-secret';
  if (readWebhookSecret(req) !== configuredSecret) {
    throw forbidden('Invalid webhook secret');
  }

  const result = await syncPayloadFromRequest(req.params.provider, req.body as Record<string, unknown>);
  res.json(result);
});

export const simulateExternalSync = asyncHandler(async (req: Request<{ provider: string }>, res: Response) => {
  const user = currentUser(req);
  const result = await syncPayloadFromRequest(req.params.provider, req.body as Record<string, unknown>, user.id);
  res.json(result);
});

export const handleChatOpsCommand = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const command = typeof req.body.command === 'string' ? req.body.command.trim() : '';
  const platform = typeof req.body.platform === 'string' ? req.body.platform : 'teams';
  if (!command) {
    throw badRequest('command is required');
  }

  const where: Prisma.GoalWhereInput =
    user.role === Role.ADMIN
      ? {}
      : user.role === Role.MANAGER
        ? {
            OR: [{ userId: user.id }, { user: { managerId: user.id } }]
          }
        : { userId: user.id };

  const goals = await prisma.goal.findMany({
    where,
    include: {
      cycle: true,
      checkIns: { orderBy: { createdAt: 'asc' } }
    },
    orderBy: { createdAt: 'asc' }
  });

  const parsed = await parseChatOpsCommand(
    command,
    goals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      target: goal.target,
      uomType: goal.uomType,
      latestActualValue: goal.checkIns.at(-1)?.actualValue
    }))
  );

  if (!parsed.goalId || parsed.intent === 'unknown') {
    return res.json({
      platform,
      message: `I could not map that command to a goal. Try: "Update my sales goal to 10000" or "Log progress on close tickets to 42".`,
      parsed
    });
  }

  const goal = goals.find((item) => item.id === parsed.goalId);
  if (!goal) {
    throw badRequest('Goal not found for parsed command');
  }

  if (parsed.intent === 'update_target' && typeof parsed.value === 'number') {
    const updatedGoal = await prisma.goal.update({
      where: { id: goal.id },
      data: { target: parsed.value }
    });
    const latest = goal.checkIns.at(-1);
    const progressScore = latest
      ? computeProgress(updatedGoal, { actualValue: latest.actualValue, completionDate: latest.completionDate })
      : 0;
    return res.json({
      platform,
      parsed,
      goal: updatedGoal,
      message: buildChatOpsReply({ goal: updatedGoal, progressScore, actionLabel: 'Updated target for' })
    });
  }

  const quarter = parseQuarter(req.body.quarter) ?? quarterFromDate(goal.cycle.startDate, new Date());
  const existing = goal.checkIns.find((entry) => entry.quarter === quarter);

  const nextActual =
    parsed.intent === 'log_progress' && typeof parsed.value === 'number'
      ? parsed.value
      : existing?.actualValue ?? 0;
  const nextProgress = computeProgress(goal, { actualValue: nextActual, completionDate: existing?.completionDate ?? null });
  const nextStatus: CheckInStatus =
    parsed.intent === 'update_status' && parsed.status
      ? (parsed.status as CheckInStatus)
      : deriveCheckInStatus(nextProgress);

  const checkIn = existing
    ? await prisma.checkIn.update({
        where: { id: existing.id },
        data: {
          actualValue: nextActual,
          status: nextStatus as CheckInStatus,
          progressScore: nextProgress,
          employeeNote: `[${platform.toUpperCase()}] ${command}`
        }
      })
    : await prisma.checkIn.create({
        data: {
          goalId: goal.id,
          userId: goal.userId,
          quarter,
          actualValue: nextActual,
          status: nextStatus as CheckInStatus,
          progressScore: nextProgress,
          employeeNote: `[${platform.toUpperCase()}] ${command}`
        }
      });

  await prisma.auditLog.create({
    data: {
      goalId: goal.id,
      userId: user.id,
      action: 'CHATOPS_COMMAND_EXECUTED',
      field: parsed.intent === 'update_status' ? 'status' : parsed.intent === 'update_target' ? 'target' : 'actualValue',
      newValue: parsed.intent === 'update_status' ? String(nextStatus) : String(parsed.value ?? nextActual)
    }
  });

  res.json({
    platform,
    parsed,
    goal,
    checkIn,
    message:
      parsed.intent === 'update_status'
        ? `${platform === 'slack' ? 'Slack' : 'Teams'} bot updated "${goal.title}" to ${nextStatus}. Progress is now ${Math.min(nextProgress, 999)}%.`
        : `${platform === 'slack' ? 'Slack' : 'Teams'} bot updated "${goal.title}". Progress is now ${Math.min(nextProgress, 999)}%.`
  });
});
