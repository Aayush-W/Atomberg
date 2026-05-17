"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPerformanceDossier = exports.getLeaderboards = exports.getQoQTrendsReport = exports.getManagerEffectivenessReport = exports.getCompletionReport = exports.getAchievementReport = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const _helpers_1 = require("./_helpers");
const ai_service_1 = require("../services/ai.service");
const reporting_service_1 = require("../services/reporting.service");
const sentiment_service_1 = require("../services/sentiment.service");
function scopeGoals(user) {
    if (user.role === client_1.Role.ADMIN) {
        return {};
    }
    if (user.role === client_1.Role.MANAGER) {
        return { user: { managerId: user.id } };
    }
    throw (0, errors_1.forbidden)('Report access is restricted to managers and admins');
}
function latestProgress(checkIns) {
    if (!checkIns.length)
        return 0;
    return [...checkIns].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].progressScore;
}
exports.getAchievementReport = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.ADMIN && user.role !== client_1.Role.MANAGER) {
        throw (0, errors_1.forbidden)('Only managers and admins can view achievement reports');
    }
    const goals = await prisma_1.prisma.goal.findMany({
        where: { cycle: { isActive: true }, ...scopeGoals(user) },
        include: {
            user: { select: { id: true, name: true, department: true, managerId: true } },
            checkIns: { orderBy: { createdAt: 'desc' } }
        }
    });
    const byUser = new Map();
    goals.forEach((goal) => {
        const current = byUser.get(goal.user.id) ?? {
            userId: goal.user.id,
            name: goal.user.name,
            department: goal.user.department,
            goals: 0,
            totalQualityScore: 0,
            totalProgressScore: 0,
            lockedGoals: 0
        };
        current.goals += 1;
        if (typeof goal.qualityScore === 'number') {
            current.totalQualityScore += goal.qualityScore;
        }
        current.totalProgressScore += latestProgress(goal.checkIns);
        if (goal.status === 'LOCKED')
            current.lockedGoals += 1;
        byUser.set(goal.user.id, current);
    });
    const report = Array.from(byUser.values()).map((entry) => ({
        userId: entry.userId,
        name: entry.name,
        department: entry.department,
        goals: entry.goals,
        avgQualityScore: entry.goals ? Number((entry.totalQualityScore / entry.goals).toFixed(2)) : 0,
        avgProgressScore: entry.goals ? Number((entry.totalProgressScore / entry.goals).toFixed(2)) : 0,
        lockedGoals: entry.lockedGoals
    }));
    res.json({ report });
});
exports.getCompletionReport = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.ADMIN && user.role !== client_1.Role.MANAGER) {
        throw (0, errors_1.forbidden)('Only managers and admins can view completion reports');
    }
    const employees = await prisma_1.prisma.user.findMany({
        where: {
            role: client_1.Role.EMPLOYEE,
            ...(user.role === client_1.Role.MANAGER ? { managerId: user.id } : {})
        },
        include: {
            manager: { select: { name: true } },
            goals: {
                where: { cycle: { isActive: true } },
                include: { checkIns: true }
            }
        }
    });
    const report = employees.map((employee) => {
        const goals = employee.goals;
        const submitted = goals.length > 0 && goals.some((goal) => goal.status !== 'DRAFT');
        const approved = goals.length > 0 && goals.every((goal) => ['APPROVED', 'LOCKED'].includes(goal.status));
        return {
            employeeName: employee.name,
            manager: employee.manager?.name ?? 'N/A',
            goalsSubmitted: submitted,
            goalsApproved: approved,
            q1Done: goals.some((goal) => goal.checkIns.some((checkIn) => checkIn.quarter === 'Q1')),
            q2Done: goals.some((goal) => goal.checkIns.some((checkIn) => checkIn.quarter === 'Q2')),
            q3Done: goals.some((goal) => goal.checkIns.some((checkIn) => checkIn.quarter === 'Q3')),
            q4Done: goals.some((goal) => goal.checkIns.some((checkIn) => checkIn.quarter === 'Q4'))
        };
    });
    res.json({ report });
});
exports.getManagerEffectivenessReport = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.ADMIN && user.role !== client_1.Role.MANAGER) {
        throw (0, errors_1.forbidden)('Only managers and admins can view effectiveness reports');
    }
    const managers = await prisma_1.prisma.user.findMany({
        where: user.role === client_1.Role.ADMIN ? { role: client_1.Role.MANAGER } : { id: user.id, role: client_1.Role.MANAGER },
        select: { id: true, name: true, department: true }
    });
    const report = await Promise.all(managers.map(async (manager) => {
        const teamMembers = await prisma_1.prisma.user.findMany({ where: { managerId: manager.id }, select: { id: true } });
        const teamIds = teamMembers.map((member) => member.id);
        const goals = await prisma_1.prisma.goal.findMany({
            where: { userId: { in: teamIds }, cycle: { isActive: true } },
            include: { checkIns: { orderBy: { createdAt: 'desc' } } }
        });
        const totalGoals = goals.length;
        const lockedGoals = goals.filter((goal) => goal.status === 'LOCKED').length;
        const submittedGoals = goals.filter((goal) => ['SUBMITTED', 'LOCKED', 'APPROVED'].includes(goal.status)).length;
        const averageProgress = totalGoals > 0 ? Number((goals.reduce((sum, goal) => sum + latestProgress(goal.checkIns), 0) / totalGoals).toFixed(2)) : 0;
        return {
            managerId: manager.id,
            managerName: manager.name,
            department: manager.department,
            teamSize: teamIds.length,
            totalGoals,
            lockedGoals,
            submittedGoals,
            approvalRate: submittedGoals ? Number(((lockedGoals / submittedGoals) * 100).toFixed(2)) : 0,
            averageProgress
        };
    }));
    res.json({ report });
});
exports.getQoQTrendsReport = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.ADMIN && user.role !== client_1.Role.MANAGER) {
        throw (0, errors_1.forbidden)('Only managers and admins can view QoQ trends');
    }
    const checkIns = await prisma_1.prisma.checkIn.findMany({
        where: { goal: { cycle: { isActive: true }, ...scopeGoals(user) } },
        select: { quarter: true, progressScore: true }
    });
    const grouped = checkIns.reduce((acc, item) => {
        const bucket = acc.get(item.quarter) ?? { quarter: item.quarter, values: [] };
        bucket.values.push(item.progressScore);
        acc.set(item.quarter, bucket);
        return acc;
    }, new Map());
    const trends = Array.from(grouped.values())
        .map((entry) => ({
        quarter: entry.quarter,
        averageProgress: entry.values.length ? Number((entry.values.reduce((a, b) => a + b, 0) / entry.values.length).toFixed(2)) : 0,
        sampleSize: entry.values.length
    }))
        .sort((a, b) => a.quarter.localeCompare(b.quarter));
    res.json({ trends });
});
exports.getLeaderboards = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.ADMIN && user.role !== client_1.Role.MANAGER) {
        throw (0, errors_1.forbidden)('Only managers and admins can view leaderboards');
    }
    const employees = await prisma_1.prisma.user.findMany({
        where: {
            role: client_1.Role.EMPLOYEE,
            ...(user.role === client_1.Role.MANAGER ? { managerId: user.id } : {})
        },
        include: {
            goals: {
                where: { cycle: { isActive: true } },
                include: { checkIns: true, kudos: true }
            }
        }
    });
    const sentiment = await (0, sentiment_service_1.buildTeamSentimentSummary)(user.role === client_1.Role.MANAGER ? user.id : undefined);
    const leaderboard = employees.reduce((acc, employee) => {
        const bucket = acc[employee.department] ?? {
            department: employee.department,
            members: 0,
            onTime: 0,
            progress: 0,
            kudos: 0,
            healthy: 0
        };
        bucket.members += 1;
        const checkIns = employee.goals.flatMap((goal) => goal.checkIns);
        const goalProgress = employee.goals.length
            ? employee.goals.reduce((sum, goal) => sum + latestProgress(goal.checkIns), 0) / employee.goals.length
            : 0;
        bucket.progress += goalProgress;
        bucket.kudos += employee.goals.reduce((sum, goal) => sum + goal.kudos.length, 0);
        bucket.onTime += checkIns.length > 0 ? 1 : 0;
        bucket.healthy += checkIns.some((checkIn) => (checkIn.sentiment ?? 0) >= 0.1) ? 1 : 0;
        acc[employee.department] = bucket;
        return acc;
    }, {});
    const rows = Object.values(leaderboard)
        .map((row) => ({
        department: row.department,
        onTimeCompliance: row.members ? Number(((row.onTime / row.members) * 100).toFixed(1)) : 0,
        averageProgress: row.members ? Number((row.progress / row.members).toFixed(1)) : 0,
        kudosEarned: row.kudos,
        healthySentimentRate: row.members ? Number(((row.healthy / row.members) * 100).toFixed(1)) : 0
    }))
        .sort((a, b) => b.onTimeCompliance - a.onTimeCompliance);
    res.json({
        leaderboard: rows,
        engagementScore: sentiment.engagementScore,
        alertFlags: sentiment.alertFlags
    });
});
exports.getPerformanceDossier = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    const employee = await prisma_1.prisma.user.findUnique({
        where: { id: req.params.userId },
        include: {
            manager: { select: { name: true } },
            goals: {
                where: { cycle: { isActive: true } },
                include: {
                    checkIns: { orderBy: { createdAt: 'asc' } },
                    kudos: {
                        include: {
                            sender: { select: { name: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'asc' }
            }
        }
    });
    if (!employee) {
        throw (0, errors_1.forbidden)('Employee not found');
    }
    const canView = user.role === client_1.Role.ADMIN ||
        user.id === employee.id ||
        (user.role === client_1.Role.MANAGER && employee.managerId === user.id);
    if (!canView) {
        throw (0, errors_1.forbidden)('You do not have access to this dossier');
    }
    const summary = await (0, ai_service_1.goalSummary)({
        employee: { id: employee.id, name: employee.name, department: employee.department, jobTitle: employee.jobTitle },
        goals: employee.goals
    });
    const goalLines = employee.goals.flatMap((goal, index) => {
        const visible = (0, reporting_service_1.maskGoalContent)(goal, user);
        const latest = goal.checkIns.at(-1);
        return [
            `${index + 1}. ${visible.title}`,
            `   Area: ${goal.thrustArea} | Weight: ${goal.weightage}% | Sensitivity: ${goal.sensitivity}`,
            `   Description: ${visible.description}`,
            `   Latest progress: ${latest?.progressScore ?? 0}% | Manager note: ${latest?.managerComment ?? goal.managerComment ?? 'N/A'}`,
            `   Kudos: ${goal.kudos.map((kudos) => `${kudos.sender.name} (${kudos.badgeType})`).join(', ') || 'None'}`
        ];
    });
    const pdf = (0, reporting_service_1.buildSimplePdf)([
        'GoalForge Performance Dossier',
        `Employee: ${employee.name}`,
        `Department: ${employee.department}`,
        `Job Title: ${employee.jobTitle ?? 'N/A'}`,
        `Manager: ${employee.manager?.name ?? 'N/A'}`,
        '',
        'AI Summary:',
        summary.summary,
        '',
        'Goals:',
        ...goalLines
    ]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="goalforge-dossier-${employee.name.replace(/\s+/g, '-').toLowerCase()}.pdf"`);
    res.send(pdf);
});
