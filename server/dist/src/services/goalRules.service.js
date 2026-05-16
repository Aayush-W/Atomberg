"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureGoalWeightage = ensureGoalWeightage;
exports.getActiveCycleOrThrow = getActiveCycleOrThrow;
exports.ensureUserCanAccessGoal = ensureUserCanAccessGoal;
exports.ensureManagerCanActOnGoal = ensureManagerCanActOnGoal;
exports.ensureCanPushSharedGoal = ensureCanPushSharedGoal;
exports.ensureGoalPortfolioLimits = ensureGoalPortfolioLimits;
exports.ensureGoalSheetTotals = ensureGoalSheetTotals;
exports.createAuditLog = createAuditLog;
exports.auditChangedFields = auditChangedFields;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../utils/errors");
const activeGoalStatuses = [client_1.GoalStatus.DRAFT, client_1.GoalStatus.SUBMITTED, client_1.GoalStatus.APPROVED, client_1.GoalStatus.LOCKED];
function ensureGoalWeightage(weightage) {
    if (weightage < 10 || weightage > 80) {
        throw (0, errors_1.badRequest)('Goal weightage must be between 10% and 80%', { field: 'weightage' });
    }
}
async function getActiveCycleOrThrow(cycleId) {
    const cycle = cycleId
        ? await prisma_1.prisma.cycle.findUnique({ where: { id: cycleId } })
        : await prisma_1.prisma.cycle.findFirst({ where: { isActive: true }, orderBy: { startDate: 'desc' } });
    if (!cycle) {
        throw (0, errors_1.badRequest)(cycleId ? 'Cycle not found' : 'No active cycle configured');
    }
    return cycle;
}
async function ensureUserCanAccessGoal(user, goal) {
    if (user.role === client_1.Role.ADMIN || goal.userId === user.id) {
        return;
    }
    if (user.role === client_1.Role.MANAGER) {
        const owner = await prisma_1.prisma.user.findUnique({ where: { id: goal.userId } });
        if (owner?.managerId === user.id) {
            return;
        }
    }
    throw (0, errors_1.forbidden)('You can only access goals in your reporting scope');
}
async function ensureManagerCanActOnGoal(user, goal) {
    if (user.role === client_1.Role.ADMIN) {
        return;
    }
    if (user.role === client_1.Role.MANAGER) {
        const owner = await prisma_1.prisma.user.findUnique({ where: { id: goal.userId } });
        if (owner?.managerId === user.id) {
            return;
        }
    }
    throw (0, errors_1.forbidden)('Only the employee manager or admin can perform this action');
}
async function ensureCanPushSharedGoal(user, employeeIds) {
    if (user.role === client_1.Role.ADMIN) {
        return;
    }
    if (user.role !== client_1.Role.MANAGER) {
        throw (0, errors_1.forbidden)('Only managers and admins can push shared goals');
    }
    const reportees = await prisma_1.prisma.user.count({
        where: {
            id: { in: employeeIds },
            managerId: user.id
        }
    });
    if (reportees !== employeeIds.length) {
        throw (0, errors_1.forbidden)('Managers can only push shared goals to their direct reportees');
    }
}
async function ensureGoalPortfolioLimits(userId, cycleId, nextGoal) {
    ensureGoalWeightage(nextGoal?.weightage ?? 10);
    const goals = await prisma_1.prisma.goal.findMany({
        where: {
            userId,
            cycleId,
            status: { in: activeGoalStatuses },
            ...(nextGoal?.id ? { id: { not: nextGoal.id } } : {})
        },
        select: { weightage: true }
    });
    const goalCount = goals.length + (nextGoal ? 1 : 0);
    if (goalCount > 8) {
        throw (0, errors_1.badRequest)('Employees can have a maximum of 8 active goals per cycle', { field: 'goals' });
    }
}
async function ensureGoalSheetTotals(userId, cycleId) {
    const goals = await prisma_1.prisma.goal.findMany({
        where: {
            userId,
            cycleId,
            status: { in: activeGoalStatuses }
        },
        select: { id: true, weightage: true }
    });
    if (goals.length === 0) {
        throw (0, errors_1.badRequest)('At least one goal is required before submission');
    }
    if (goals.length > 8) {
        throw (0, errors_1.badRequest)('Employees can have a maximum of 8 active goals per cycle', { field: 'goals' });
    }
    const invalidGoal = goals.find((goal) => goal.weightage < 10 || goal.weightage > 80);
    if (invalidGoal) {
        throw (0, errors_1.badRequest)('Every goal weightage must be between 10% and 80%', {
            field: 'weightage',
            goalId: invalidGoal.id
        });
    }
    const totalWeightage = goals.reduce((sum, goal) => sum + goal.weightage, 0);
    if (Math.abs(totalWeightage - 100) > 0.001) {
        throw (0, errors_1.badRequest)('Total weightage across active goals must equal 100%', {
            field: 'weightage',
            totalWeightage
        });
    }
}
async function createAuditLog(data) {
    await prisma_1.prisma.auditLog.create({
        data: {
            goalId: data.goalId,
            userId: data.userId,
            action: data.action,
            field: data.field,
            oldValue: data.oldValue,
            newValue: data.newValue
        }
    });
}
async function auditChangedFields(userId, before, after, fields) {
    const logs = [];
    for (const field of fields) {
        const oldValue = before[field] instanceof Date ? before[field]?.toISOString() : before[field]?.toString() ?? null;
        const newValue = after[field] instanceof Date ? after[field]?.toISOString() : after[field]?.toString() ?? null;
        if (oldValue !== newValue) {
            logs.push({
                goalId: before.id,
                userId,
                action: before.lockedAt ? 'POST_LOCK_CHANGE' : 'GOAL_UPDATED',
                field,
                oldValue,
                newValue
            });
        }
    }
    if (logs.length > 0) {
        await prisma_1.prisma.auditLog.createMany({ data: logs });
    }
}
