"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWhatIfSimulation = runWhatIfSimulation;
exports.buildCalibrationCopilot = buildCalibrationCopilot;
exports.buildNarrativeInputs = buildNarrativeInputs;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const risk_service_1 = require("./risk.service");
const sentiment_service_1 = require("./sentiment.service");
function average(values) {
    if (!values.length)
        return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function stddev(values) {
    if (values.length <= 1)
        return 0;
    const avg = average(values);
    return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length);
}
async function runWhatIfSimulation(input) {
    const goal = await prisma_1.prisma.goal.findUnique({
        where: { id: input.goalId },
        include: {
            user: true,
            dependencies: true,
            dependents: true,
            checkIns: { orderBy: { createdAt: 'asc' } }
        }
    });
    if (!goal) {
        throw new Error('Goal not found');
    }
    const ownerGoals = await prisma_1.prisma.goal.findMany({
        where: { tenantId: input.tenantId, userId: goal.userId, cycleId: goal.cycleId },
        include: { checkIns: { orderBy: { createdAt: 'asc' } } }
    });
    const teamGoals = await prisma_1.prisma.goal.findMany({
        where: input.requesterRole === client_1.Role.ADMIN
            ? { tenantId: input.tenantId, cycleId: goal.cycleId }
            : { tenantId: input.tenantId, cycleId: goal.cycleId, user: { managerId: input.requesterId } },
        include: { user: true, checkIns: { orderBy: { createdAt: 'asc' } } }
    });
    const currentPortfolioWeight = ownerGoals.reduce((sum, item) => sum + item.weightage, 0);
    const newPortfolioWeight = currentPortfolioWeight - goal.weightage + input.newWeightage;
    const weightDelta = input.newWeightage - goal.weightage;
    const currentTeamAvg = average(teamGoals.map((item) => item.checkIns.at(-1)?.progressScore ?? 0));
    const projectedTeamAvg = Math.max(0, Math.min(100, currentTeamAvg - Math.max(0, weightDelta) * 0.15 + Math.max(0, -weightDelta) * 0.05));
    const riskReport = await (0, risk_service_1.buildFlightRiskReport)(input.tenantId, goal.user.managerId ?? undefined);
    const ownerRisk = riskReport.employees.find((item) => item.userId === goal.userId);
    const projectedRiskScore = Math.max(0, Math.min(100, Math.round((ownerRisk?.riskScore ?? 35) + weightDelta * 0.8)));
    const alignmentCoverageBefore = Math.max(20, 100 - goal.dependencies.length * 8 - goal.dependents.length * 5 + (goal.isShared ? 15 : 0));
    const alignmentCoverageAfter = Math.max(10, Math.min(100, alignmentCoverageBefore - Math.max(0, -weightDelta) * 0.4 + Math.max(0, weightDelta) * 0.2));
    const insights = [
        weightDelta > 0
            ? `Increasing this goal by ${weightDelta}% pushes the owner's portfolio from ${currentPortfolioWeight}% to ${newPortfolioWeight}%, which raises concentration risk.`
            : `Reducing this goal by ${Math.abs(weightDelta)}% frees capacity for the owner and lowers single-goal concentration.`,
        projectedRiskScore >= (ownerRisk?.riskScore ?? 0)
            ? 'Burnout and flight-risk indicators are projected to rise unless scope is reduced elsewhere.'
            : 'The change lowers projected strain and should improve delivery sustainability.',
        alignmentCoverageAfter < alignmentCoverageBefore
            ? 'Lower weight reduces visible organizational alignment coverage for this branch of the goal tree.'
            : 'This change preserves or strengthens alignment coverage across related goals.'
    ];
    return {
        goal: {
            id: goal.id,
            title: goal.title,
            ownerName: goal.user.name
        },
        before: {
            weightage: goal.weightage,
            ownerPortfolioWeight: currentPortfolioWeight,
            teamAverageProgress: Number(currentTeamAvg.toFixed(1)),
            ownerRiskScore: ownerRisk?.riskScore ?? null,
            alignmentCoverage: Number(alignmentCoverageBefore.toFixed(1))
        },
        after: {
            weightage: input.newWeightage,
            ownerPortfolioWeight: Number(newPortfolioWeight.toFixed(1)),
            teamAverageProgress: Number(projectedTeamAvg.toFixed(1)),
            ownerRiskScore: projectedRiskScore,
            alignmentCoverage: Number(alignmentCoverageAfter.toFixed(1))
        },
        insights
    };
}
function ratingFromScore(score) {
    if (score >= 85)
        return 'OUTSTANDING';
    if (score >= 70)
        return 'EXCEEDS';
    if (score >= 55)
        return 'MEETS';
    if (score >= 40)
        return 'DEVELOPING';
    return 'AT_RISK';
}
async function buildCalibrationCopilot(tenantId, managerId) {
    const where = managerId
        ? { tenantId, role: client_1.Role.EMPLOYEE, managerId }
        : { tenantId, role: client_1.Role.EMPLOYEE };
    const employees = await prisma_1.prisma.user.findMany({
        where,
        include: {
            manager: { select: { name: true } },
            goals: {
                include: { checkIns: { orderBy: { createdAt: 'asc' } } }
            },
            kudosReceived: true,
            checkIns: true
        },
        orderBy: { name: 'asc' }
    });
    const rows = employees.map((employee) => {
        const avgProgress = average(employee.goals.map((goal) => goal.checkIns.at(-1)?.progressScore ?? 0));
        const lockedRate = employee.goals.length > 0
            ? employee.goals.filter((goal) => goal.status === client_1.GoalStatus.LOCKED || goal.status === client_1.GoalStatus.APPROVED).length / employee.goals.length
            : 0;
        const avgSentiment = average(employee.checkIns.map((entry) => entry.sentiment ?? 0));
        const kudosBoost = Math.min(10, employee.kudosReceived.length * 2.5);
        const compositeScore = Math.max(0, Math.min(100, Number((avgProgress * 0.55 + lockedRate * 100 * 0.2 + ((avgSentiment + 1) / 2) * 100 * 0.15 + kudosBoost).toFixed(1))));
        const suggestedRating = ratingFromScore(compositeScore);
        const inflationRisk = lockedRate >= 0.8 && avgProgress < 55 ? 'HIGH' : lockedRate >= 0.7 && avgProgress < 65 ? 'MEDIUM' : 'LOW';
        return {
            userId: employee.id,
            userName: employee.name,
            managerName: employee.manager?.name ?? null,
            department: employee.department,
            avgProgress: Number(avgProgress.toFixed(1)),
            lockedRate: Number((lockedRate * 100).toFixed(1)),
            avgSentiment: Number(avgSentiment.toFixed(2)),
            kudosCount: employee.kudosReceived.length,
            compositeScore,
            suggestedRating,
            inflationRisk,
            evidence: [
                `Average progress is ${avgProgress.toFixed(0)}%.`,
                `${(lockedRate * 100).toFixed(0)}% of goals are approved or locked.`,
                `Average sentiment is ${avgSentiment.toFixed(2)} with ${employee.kudosReceived.length} kudos signal(s).`
            ],
            recommendation: inflationRisk === 'HIGH'
                ? 'Validate ratings against hard evidence before final calibration.'
                : suggestedRating === 'OUTSTANDING'
                    ? 'Use as a benchmark case during calibration.'
                    : 'Review goals, sentiment, and peer evidence to confirm final placement.'
        };
    });
    const distribution = rows.reduce((acc, row) => {
        acc[row.suggestedRating] = (acc[row.suggestedRating] || 0) + 1;
        return acc;
    }, {});
    return {
        summary: {
            teamSize: rows.length,
            scoreSpread: Number(stddev(rows.map((row) => row.compositeScore)).toFixed(1)),
            inflationHotspots: rows.filter((row) => row.inflationRisk !== 'LOW').length,
            distribution
        },
        employees: rows.sort((a, b) => b.compositeScore - a.compositeScore)
    };
}
async function buildNarrativeInputs(tenantId, managerId) {
    const sentiment = await (0, sentiment_service_1.buildTeamSentimentSummary)(tenantId, managerId);
    const risk = await (0, risk_service_1.buildFlightRiskReport)(tenantId, managerId);
    const goals = await prisma_1.prisma.goal.findMany({
        where: managerId ? { tenantId, user: { managerId } } : { tenantId },
        include: {
            dependencies: true,
            checkIns: { orderBy: { createdAt: 'asc' } },
            user: { select: { name: true, department: true } }
        }
    });
    const pendingApprovals = goals.filter((goal) => goal.status === client_1.GoalStatus.SUBMITTED).length;
    const dependencyLoad = goals.reduce((sum, goal) => sum + goal.dependencies.length, 0);
    const avgProgress = average(goals.map((goal) => goal.checkIns.at(-1)?.progressScore ?? 0));
    return {
        sentiment,
        risk,
        portfolio: {
            goalCount: goals.length,
            pendingApprovals,
            dependencyLoad,
            avgProgress: Number(avgProgress.toFixed(1))
        }
    };
}
