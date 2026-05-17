import { CheckInStatus, Goal, Quarter, UoMType } from '@prisma/client';

type GoalForProgress = Pick<Goal, 'uomType' | 'target' | 'targetDate'>;

export function computeProgress(goal: GoalForProgress, input: { actualValue?: number | null; completionDate?: Date | string | null }) {
  const uom = goal.uomType as UoMType;
  const actual = typeof input.actualValue === 'number' ? input.actualValue : 0;

  if (uom === UoMType.MAX) {
    if (!goal.target || goal.target === 0 || actual === 0) return actual === 0 ? 100 : 0;
    return Math.round((goal.target / actual) * 100);
  }

  if (uom === UoMType.MIN) {
    if (!goal.target || goal.target === 0) return 0;
    return Math.round((actual / goal.target) * 100);
  }

  if (uom === UoMType.TIMELINE) {
    const completion = input.completionDate;
    if (!goal.targetDate || !completion) return 0;
    const diff = Math.floor((goal.targetDate.getTime() - new Date(completion).getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0) return 100;
    return Math.max(0, 100 + diff * 2);
  }

  if (uom === UoMType.ZERO) {
    return actual === 0 ? 100 : 0;
  }

  return 0;
}

export function deriveCheckInStatus(progressScore: number): CheckInStatus {
  if (progressScore >= 100) return CheckInStatus.COMPLETED;
  if (progressScore <= 0) return CheckInStatus.NOT_STARTED;
  return CheckInStatus.ON_TRACK;
}

export function quarterFromDate(cycleStartDate: Date | string | null | undefined, date = new Date()): Quarter {
  const eventDate = date instanceof Date ? date : new Date(date);

  if (!cycleStartDate) {
    const month = eventDate.getUTCMonth();
    if (month <= 2) return Quarter.Q1;
    if (month <= 5) return Quarter.Q2;
    if (month <= 8) return Quarter.Q3;
    return Quarter.Q4;
  }

  const start = cycleStartDate instanceof Date ? cycleStartDate : new Date(cycleStartDate);
  const deltaMonths =
    (eventDate.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (eventDate.getUTCMonth() - start.getUTCMonth());
  const normalized = ((deltaMonths % 12) + 12) % 12;

  if (normalized <= 2) return Quarter.Q1;
  if (normalized <= 5) return Quarter.Q2;
  if (normalized <= 8) return Quarter.Q3;
  return Quarter.Q4;
}

export function isAfterHours(timestamp: Date | string) {
  const value = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const hour = value.getHours();
  return hour >= 21 || hour < 7;
}
