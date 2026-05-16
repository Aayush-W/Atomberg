"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQoQTrendsReport = exports.getManagerEffectivenessReport = exports.getCompletionReport = exports.getAchievementReport = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const _helpers_1 = require("./_helpers");
function scopeGoals(user) {
    if (user.role === client_1.Role.ADMIN) {
        return {};
    }
    if (user.role === client_1.Role.MANAGER) {
        return { user: { managerId: user.id } };
    }
    throw (0, errors_1.forbidden)('Report access is restricted to managers and admins');
}
function buildTeamQuery(user) {
    if (user.role === client_1.Role.ADMIN) {
        return {};
    }
    return { managerId: user.id };
}
function latestProgress(checkIns) {
    if (!checkIns.length)
        return 0;
    return checkIns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].progressScore;
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
            avgQualityScore: 0,
            avgProgressScore: 0,
            lockedGoals: 0,
            totalQualityScore: 0,
            totalProgressScore: 0
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
    const goals = await prisma_1.prisma.goal.findMany({
        where: { cycle: { isActive: true }, ...scopeGoals(user) },
        include: {
            user: { select: { id: true, name: true, department: true, managerId: true } },
            checkIns: { orderBy: { createdAt: 'desc' } }
        }
    });
    const goalRows = goals.map((goal) => ({
        goalId: goal.id,
        title: goal.title,
        status: goal.status,
        employee: goal.user.name,
        department: goal.user.department,
        locked: goal.status === 'LOCKED',
        latestProgress: latestProgress(goal.checkIns),
        checkIns: goal.checkIns.length,
        completionStatus: goal.status === 'LOCKED' || goal.status === 'APPROVED' ? 'COMPLETED' : 'IN_PROGRESS'
    }));
    const departmentStats = Array.from(goalRows.reduce((acc, row) => {
        const current = acc.get(row.department) ?? { department: row.department, goals: 0, completed: 0, averageProgress: 0, totalProgress: 0 };
        current.goals += 1;
        if (row.completionStatus === 'COMPLETED')
            current.completed += 1;
        current.totalProgress += row.latestProgress;
        acc.set(row.department, current);
        return acc;
    }, new Map()).values()).map((entry) => ({
        department: entry.department,
        goals: entry.goals,
        completed: entry.completed,
        completionRate: entry.goals ? Number(((entry.completed / entry.goals) * 100).toFixed(2)) : 0,
        averageProgress: entry.goals ? Number((entry.totalProgress / entry.goals).toFixed(2)) : 0
    }));
    res.json({ goals: goalRows, departmentStats });
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
        const submittedGoals = goals.filter((goal) => goal.status === 'SUBMITTED' || goal.status === 'LOCKED' || goal.status === 'APPROVED').length;
        const averageProgress = totalGoals ? Number((goals.reduce((sum, goal) => sum + latestProgress(goal.checkIns), 0) / totalGoals).toFixed(2)) : 0;
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
