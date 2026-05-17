import { Goal, GoalConflictSeverity, GoalConflictStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { conflictCheck } from './ai.service';

type GoalSummary = Pick<Goal, 'id' | 'cycleId' | 'title' | 'description' | 'thrustArea' | 'target' | 'uomType' | 'weightage'> & {
  user?: { department: string };
};

export async function refreshGoalConflictAlerts(goals: GoalSummary[]) {
  if (goals.length < 2) {
    return [];
  }

  const result = await conflictCheck(goals);
  const cycleId = goals[0].cycleId;
  const department = goals[0].user?.department ?? 'Unknown';

  const existing = await prisma.goalConflictAlert.findMany({
    where: { cycleId, department, status: GoalConflictStatus.OPEN }
  });
  const keepKeys = new Set<string>();

  for (const item of result.conflicts) {
    const goalA = goals[item.goal1Index];
    const goalB = goals[item.goal2Index];
    if (!goalA || !goalB) {
      continue;
    }

    const key = [goalA.id, goalB.id].sort().join(':');
    keepKeys.add(key);
    const current = existing.find((alert) => [alert.goalAId, alert.goalBId].sort().join(':') === key);
    if (current) {
      await prisma.goalConflictAlert.update({
        where: { id: current.id },
        data: {
          severity: item.severity as GoalConflictSeverity,
          reason: item.reason,
          detectedAt: new Date(),
          status: GoalConflictStatus.OPEN
        }
      });
      continue;
    }

    await prisma.goalConflictAlert.create({
      data: {
        goalAId: goalA.id,
        goalBId: goalB.id,
        cycleId,
        department,
        severity: item.severity as GoalConflictSeverity,
        reason: item.reason,
        status: GoalConflictStatus.OPEN
      }
    });
  }

  const stale = existing.filter((alert) => !keepKeys.has([alert.goalAId, alert.goalBId].sort().join(':')));
  if (stale.length > 0) {
    await prisma.goalConflictAlert.updateMany({
      where: { id: { in: stale.map((alert) => alert.id) } },
      data: { status: GoalConflictStatus.RESOLVED }
    });
  }

  return prisma.goalConflictAlert.findMany({
    where: { cycleId, department, status: GoalConflictStatus.OPEN },
    orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }]
  });
}
