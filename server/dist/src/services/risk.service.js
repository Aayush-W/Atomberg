"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFlightRiskReport = buildFlightRiskReport;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const checkinProgress_service_1 = require("./checkinProgress.service");
function average(values) {
    if (!values.length)
        return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function latestProgressByGoal(goals) {
    return goals.map((goal) => {
        const latest = [...goal.checkIns].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
        return latest?.progressScore ?? 0;
    });
}
function recommendedActionFromReasons(reasons) {
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
async function buildFlightRiskReport(managerId) {
    const where = managerId
        ? { role: client_1.Role.EMPLOYEE, managerId }
        : { role: client_1.Role.EMPLOYEE };
    const employees = await prisma_1.prisma.user.findMany({
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
    const employeesAtRisk = employees.map((employee) => {
        const sentiments = employee.checkIns.map((entry) => entry.sentiment).filter((value) => typeof value === 'number');
        const avgSentiment = Number(average(sentiments).toFixed(3));
        const sentimentTrend = sentiments.length >= 2 ? Number((sentiments[sentiments.length - 1] - sentiments[0]).toFixed(3)) : 0;
        const activityTimestamps = [
            ...employee.checkIns.map((entry) => entry.updatedAt),
            ...employee.auditLogs.map((entry) => entry.timestamp)
        ];
        const afterHoursCount = activityTimestamps.filter((value) => (0, checkinProgress_service_1.isAfterHours)(value)).length;
        const afterHoursActivityRate = activityTimestamps.length
            ? Number((afterHoursCount / activityTimestamps.length).toFixed(2))
            : 0;
        const maxCapacityGoals = employee.goals.filter((goal) => goal.uomType === 'MAX' || goal.weightage >= 40).length;
        const avgProgress = Number(average(latestProgressByGoal(employee.goals)).toFixed(1));
        const kudosCount = employee.kudosReceived.length;
        let riskScore = 0;
        const reasons = [];
        if (avgSentiment <= -0.1) {
            riskScore += 25;
            reasons.push('Average check-in sentiment is trending negative.');
        }
        else if (avgSentiment < 0.1) {
            riskScore += 10;
        }
        if (sentimentTrend <= -0.25) {
            riskScore += 20;
            reasons.push('Quarter-over-quarter sentiment dropped sharply.');
        }
        else if (sentimentTrend <= -0.1) {
            riskScore += 10;
        }
        if (afterHoursActivityRate >= 0.4) {
            riskScore += 20;
            reasons.push('A large share of updates are happening after-hours.');
        }
        else if (afterHoursActivityRate >= 0.2) {
            riskScore += 10;
        }
        if (maxCapacityGoals >= 2) {
            riskScore += 15;
            reasons.push('Multiple goals are configured as high-capacity or high-weight commitments.');
        }
        if (avgProgress >= 70 && (avgSentiment < 0.1 || afterHoursActivityRate >= 0.2)) {
            riskScore += 10;
            reasons.push('High output is being sustained alongside strain indicators.');
        }
        if (kudosCount >= 2 && afterHoursActivityRate >= 0.2) {
            riskScore += 10;
            reasons.push('Highly recognized employee may be carrying hidden load.');
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
