import { CheckInStatus, Goal, GoalStatus, Prisma, Quarter } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { computeProgress, deriveCheckInStatus, quarterFromDate } from './checkinProgress.service';

type SyncPayload = {
  provider: string;
  goalId: string;
  quarter?: Quarter;
  incrementBy?: number;
  actualValue?: number;
  status?: CheckInStatus;
  eventTitle?: string;
  note?: string;
  eventTimestamp?: Date;
  actorUserId?: string;
};

export async function applyGoalProgressSync(payload: SyncPayload) {
  const goal = await prisma.goal.findUnique({
    where: { id: payload.goalId },
    include: {
      cycle: true,
      checkIns: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!goal) {
    throw new Error('Goal not found');
  }

  const quarter = payload.quarter ?? quarterFromDate(goal.cycle.startDate, payload.eventTimestamp ?? new Date());
  const existing = goal.checkIns.find((entry) => entry.quarter === quarter);
  const baseActual = payload.actualValue ?? ((existing?.actualValue ?? 0) + (payload.incrementBy ?? 0));
  const progressScore = computeProgress(goal, { actualValue: baseActual, completionDate: payload.eventTimestamp ?? null });
  const status = payload.status ?? deriveCheckInStatus(progressScore);
  const providerLabel = payload.provider.toUpperCase();
  const employeeNote = [payload.eventTitle, payload.note].filter(Boolean).join(' - ') || `${providerLabel} sync received`;

  const data: Prisma.CheckInUncheckedCreateInput | Prisma.CheckInUncheckedUpdateInput = {
    actualValue: baseActual,
    status,
    progressScore,
    employeeNote,
    sentiment: null
  };

  const checkIn = existing
    ? await prisma.checkIn.update({
        where: { id: existing.id },
        data
      })
    : await prisma.checkIn.create({
        data: {
          ...(data as Prisma.CheckInUncheckedCreateInput),
          goalId: goal.id,
          userId: goal.userId,
          quarter
        }
      });

  await prisma.auditLog.create({
    data: {
      goalId: goal.id,
      userId: payload.actorUserId ?? goal.userId,
      action: `INTEGRATION_SYNC_${providerLabel}`,
      field: 'actualValue',
      oldValue: existing ? String(existing.actualValue) : null,
      newValue: String(checkIn.actualValue)
    }
  });

  return {
    goal,
    checkIn,
    quarter,
    progressScore,
    status,
    message: `${providerLabel} sync applied to "${goal.title}". Progress is now ${Math.min(progressScore, 999)}%.`
  };
}

export function buildChatOpsReply(args: { goal: Goal; progressScore: number; actionLabel: string; status?: GoalStatus | CheckInStatus }) {
  return `${args.actionLabel} "${args.goal.title}". Progress is now ${Math.min(args.progressScore, 999)}%.`;
}
