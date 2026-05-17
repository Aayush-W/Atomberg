import { Prisma, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { isAfterHours } from './checkinProgress.service';

type FlightRiskItem = {
  userId: string;
  userName: string;
  department: string;
  jobTitle: string | null;
  managerName: string | null;
  riskScore: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  avgSentiment: number;
  sentimentTrend: number;
  afterHoursActivityRate: number;
  maxCapacityGoals: number;
  avgProgress: number;
  kudosCount: number;
  reasons: string[];
  explainability: Array<{
    factor: string;
    value: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    rationale: string;
  }>;
  confidence: number;
  recommendedAction: string;
};

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function latestProgressByGoal(
  goals: Array<{
    id: string;
    weightage: number;
    uomType: string;
    checkIns: Array<{ quarter: string; progressScore: number; sentiment: number | null; createdAt: Date; updatedAt: Date }>;
  }>
) {
  return goals.map((goal) => {
    const latest = [...goal.checkIns].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    return latest?.progressScore ?? 0;
  });
}

function recommendedActionFromReasons(reasons: string[]) {
  if (reasons.some((reason) => reason.includes('after-hours'))) {
    return 'Check workload and staffing this week, then rebalance responsibilities before the next milestone.';
  }
  if (reasons.some((reason) => reason.includes('sentiment'))) {
    return 'Schedule a one-on-one focused on blockers, morale, and support needs rather than delivery status.';
  }
  if (reasons.some((reason) => reason.includes('capacity'))) {
    return 'Review goal scope and reduce peak load by narrowing or sequencing one major commitment.';
  }
  return 'Maintain a proactive manager check-in cadence and watch the next reporting cycle closely.';
}

function buildConfidence(signals: { sentimentCount: number; activityCount: number; goalCount: number; kudosCount: number }) {
  const score = Math.min(
    0.95,
    0.35 +
      Math.min(signals.sentimentCount, 6) * 0.05 +
      Math.min(signals.activityCount, 12) * 0.02 +
      Math.min(signals.goalCount, 5) * 0.03 +
      Math.min(signals.kudosCount, 4) * 0.02
  );
  return Number(score.toFixed(2));
}

export async function buildFlightRiskReport(tenantId: string, managerId?: string) {
  const where: Prisma.UserWhereInput = managerId
    ? { tenantId, role: Role.EMPLOYEE, managerId }
    : { tenantId, role: Role.EMPLOYEE };

  const employees = await prisma.user.findMany({
    where,
    include: {
      manager: { select: { name: true } },
      goals: {
        include: {
          checkIns: {
            orderBy: { createdAt: 'asc' }
          }
        }
      },
      checkIns: {
        orderBy: { createdAt: 'asc' }
      },
      kudosReceived: true,
      auditLogs: {
        orderBy: { timestamp: 'desc' },
        take: 40
      }
    },
    orderBy: { name: 'asc' }
  });

  const employeesAtRisk: FlightRiskItem[] = employees.map((employee) => {
    const sentiments = employee.checkIns.map((entry) => entry.sentiment).filter((value): value is number => typeof value === 'number');
    const avgSentiment = Number(average(sentiments).toFixed(3));
    const sentimentTrend =
      sentiments.length >= 2 ? Number((sentiments[sentiments.length - 1] - sentiments[0]).toFixed(3)) : 0;

    const activityTimestamps = [
      ...employee.checkIns.map((entry) => entry.updatedAt),
      ...employee.auditLogs.map((entry) => entry.timestamp)
    ];
    const afterHoursCount = activityTimestamps.filter((value) => isAfterHours(value)).length;
    const afterHoursActivityRate = activityTimestamps.length
      ? Number((afterHoursCount / activityTimestamps.length).toFixed(2))
      : 0;

    const maxCapacityGoals = employee.goals.filter((goal) => goal.uomType === 'MAX' || goal.weightage >= 40).length;
    const avgProgress = Number(average(latestProgressByGoal(employee.goals)).toFixed(1));
    const kudosCount = employee.kudosReceived.length;
    const explainability: FlightRiskItem['explainability'] = [];

    let riskScore = 0;
    const reasons: string[] = [];

    if (avgSentiment <= -0.1) {
      riskScore += 25;
      reasons.push('Average check-in sentiment is trending negative.');
      explainability.push({
        factor: 'Sentiment Baseline',
        value: avgSentiment.toFixed(2),
        impact: 'HIGH',
        rationale: 'Sustained negative sentiment often precedes disengagement and attrition.'
      });
    } else if (avgSentiment < 0.1) {
      riskScore += 10;
      explainability.push({
        factor: 'Sentiment Baseline',
        value: avgSentiment.toFixed(2),
        impact: 'MEDIUM',
        rationale: 'Neutral sentiment with low positive language can indicate early strain.'
      });
    }

    if (sentimentTrend <= -0.25) {
      riskScore += 20;
      reasons.push('Quarter-over-quarter sentiment dropped sharply.');
      explainability.push({
        factor: 'Sentiment Trend',
        value: sentimentTrend.toFixed(2),
        impact: 'HIGH',
        rationale: 'A sharp drop is a stronger attrition signal than a one-time negative note.'
      });
    } else if (sentimentTrend <= -0.1) {
      riskScore += 10;
      explainability.push({
        factor: 'Sentiment Trend',
        value: sentimentTrend.toFixed(2),
        impact: 'MEDIUM',
        rationale: 'Sentiment is drifting downward over time.'
      });
    }

    if (afterHoursActivityRate >= 0.4) {
      riskScore += 20;
      reasons.push('A large share of updates are happening after-hours.');
      explainability.push({
        factor: 'After-hours Activity',
        value: `${Math.round(afterHoursActivityRate * 100)}%`,
        impact: 'HIGH',
        rationale: 'Repeated late-night activity suggests unsustainable delivery pressure.'
      });
    } else if (afterHoursActivityRate >= 0.2) {
      riskScore += 10;
      explainability.push({
        factor: 'After-hours Activity',
        value: `${Math.round(afterHoursActivityRate * 100)}%`,
        impact: 'MEDIUM',
        rationale: 'Work is increasingly spilling outside normal hours.'
      });
    }

    if (maxCapacityGoals >= 2) {
      riskScore += 15;
      reasons.push('Multiple goals are configured as high-capacity or high-weight commitments.');
      explainability.push({
        factor: 'Capacity Load',
        value: `${maxCapacityGoals} high-load goals`,
        impact: 'MEDIUM',
        rationale: 'Stacked high-weight goals increase overload risk even when progress looks healthy.'
      });
    }

    if (avgProgress >= 70 && (avgSentiment < 0.1 || afterHoursActivityRate >= 0.2)) {
      riskScore += 10;
      reasons.push('High output is being sustained alongside strain indicators.');
      explainability.push({
        factor: 'Performance vs Strain',
        value: `${avgProgress.toFixed(0)}% progress`,
        impact: 'MEDIUM',
        rationale: 'Strong delivery paired with strain often hides retention risk in high performers.'
      });
    }

    if (kudosCount >= 2 && afterHoursActivityRate >= 0.2) {
      riskScore += 10;
      reasons.push('Highly recognized employee may be carrying hidden load.');
      explainability.push({
        factor: 'Recognition Load',
        value: `${kudosCount} kudos`,
        impact: 'LOW',
        rationale: 'High-recognition teammates sometimes absorb extra invisible work for the team.'
      });
    }

    const normalizedScore = Math.max(0, Math.min(100, Math.round(riskScore)));
    const riskLevel = normalizedScore >= 70 ? 'HIGH' : normalizedScore >= 40 ? 'MEDIUM' : 'LOW';

    return {
      userId: employee.id,
      userName: employee.name,
      department: employee.department,
      jobTitle: employee.jobTitle,
      managerName: employee.manager?.name ?? null,
      riskScore: normalizedScore,
      riskLevel,
      avgSentiment,
      sentimentTrend,
      afterHoursActivityRate,
      maxCapacityGoals,
      avgProgress,
      kudosCount,
      reasons: reasons.length ? reasons : ['No elevated risk signals detected from current metadata.'],
      explainability: explainability.length
        ? explainability
        : [
            {
              factor: 'No Elevated Signals',
              value: 'Stable',
              impact: 'LOW',
              rationale: 'Current metadata does not show strong burnout or retention risk indicators.'
            }
          ],
      confidence: buildConfidence({
        sentimentCount: sentiments.length,
        activityCount: activityTimestamps.length,
        goalCount: employee.goals.length,
        kudosCount
      }),
      recommendedAction: recommendedActionFromReasons(reasons)
    };
  });

  const summary = {
    high: employeesAtRisk.filter((item) => item.riskLevel === 'HIGH').length,
    medium: employeesAtRisk.filter((item) => item.riskLevel === 'MEDIUM').length,
    low: employeesAtRisk.filter((item) => item.riskLevel === 'LOW').length
  };

  return {
    summary,
    employees: employeesAtRisk.sort((a, b) => b.riskScore - a.riskScore)
  };
}
