"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCheckIn = exports.updateCheckIn = exports.getCheckIn = exports.listGoalCheckIns = exports.createCheckIn = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const _helpers_1 = require("./_helpers");
const goalRules_service_1 = require("../services/goalRules.service");
function computeProgress(goal, input) {
    const uom = goal.uomType;
    const actual = typeof input.actualValue === 'number' ? input.actualValue : 0;
    if (uom === client_1.UoMType.MAX) {
        if (!goal.target || goal.target === 0)
            return 0;
        return Math.min(100, (actual / goal.target) * 100);
    }
    if (uom === client_1.UoMType.MIN) {
        if (!goal.target || goal.target === 0)
            return 0;
        // lower is better: if actual <= target -> 100, else degrade
        if (actual <= goal.target)
            return 100;
        const ratio = Math.max(0, 1 - (actual - goal.target) / goal.target);
        return Math.round(Math.max(0, ratio * 100));
    }
    if (uom === client_1.UoMType.TIMELINE) {
        const completion = input.completionDate;
        if (!goal.targetDate)
            return 0;
        if (!completion)
            return 0;
        const diff = Math.floor((goal.targetDate.getTime() - completion.getTime()) / (1000 * 60 * 60 * 24));
        // on-time or early => 100, late decreases by 2 points per day late
        if (diff >= 0)
            return 100;
        return Math.max(0, 100 + diff * 2); // diff is negative when late
    }
    // ZERO (binary) or fallback
    if (uom === client_1.UoMType.ZERO) {
        return actual > 0 ? 100 : 0;
    }
    return 0;
}
exports.createCheckIn = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (!user)
        throw (0, errors_1.unauthorized)();
    const goal = await prisma_1.prisma.goal.findUnique({ where: { id: req.body.goalId } });
    if (!goal)
        throw (0, errors_1.badRequest)('Goal not found');
    await (0, goalRules_service_1.ensureUserCanAccessGoal)(user, goal);
    if (user.role === 'EMPLOYEE' && goal.userId !== user.id) {
        throw (0, errors_1.forbidden)('Employees can only create check-ins for their own goals');
    }
    const progress = computeProgress(goal, req.body);
    const checkIn = await prisma_1.prisma.checkIn.create({
        data: {
            goalId: req.body.goalId,
            userId: user.id,
            quarter: req.body.quarter,
            actualValue: req.body.actualValue,
            completionDate: req.body.completionDate ?? null,
            status: req.body.status ?? 'ON_TRACK',
            progressScore: progress
        }
    });
    await (0, goalRules_service_1.createAuditLog)({ goalId: goal.id, userId: user.id, action: 'CHECKIN_CREATED' });
    res.status(201).json({ checkIn });
});
exports.listGoalCheckIns = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (!user)
        throw (0, errors_1.unauthorized)();
    const goal = await prisma_1.prisma.goal.findUnique({ where: { id: req.params.goalId } });
    if (!goal)
        throw (0, errors_1.badRequest)('Goal not found');
    await (0, goalRules_service_1.ensureUserCanAccessGoal)(user, goal);
    const checkIns = await prisma_1.prisma.checkIn.findMany({ where: { goalId: goal.id }, orderBy: { createdAt: 'asc' } });
    res.json({ checkIns });
});
exports.getCheckIn = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (!user)
        throw (0, errors_1.unauthorized)();
    const checkIn = await prisma_1.prisma.checkIn.findUnique({ where: { id: req.params.id } });
    if (!checkIn)
        throw (0, errors_1.badRequest)('Check-in not found');
    const goal = await prisma_1.prisma.goal.findUnique({ where: { id: checkIn.goalId } });
    if (!goal)
        throw (0, errors_1.badRequest)('Associated goal not found');
    await (0, goalRules_service_1.ensureUserCanAccessGoal)(user, goal);
    res.json({ checkIn });
});
exports.updateCheckIn = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (!user)
        throw (0, errors_1.unauthorized)();
    const existing = await prisma_1.prisma.checkIn.findUnique({ where: { id: req.params.id } });
    if (!existing)
        throw (0, errors_1.badRequest)('Check-in not found');
    const goal = await prisma_1.prisma.goal.findUnique({ where: { id: existing.goalId } });
    if (!goal)
        throw (0, errors_1.badRequest)('Associated goal not found');
    await (0, goalRules_service_1.ensureUserCanAccessGoal)(user, goal);
    // Only managers/admins can add manager comments
    if (req.body.managerComment && user.role === 'EMPLOYEE') {
        throw (0, errors_1.forbidden)('Only managers or admins can add manager comments');
    }
    const toUpdate = {};
    if (req.body.actualValue !== undefined)
        toUpdate.actualValue = req.body.actualValue;
    if (req.body.completionDate !== undefined)
        toUpdate.completionDate = req.body.completionDate;
    if (req.body.status !== undefined)
        toUpdate.status = req.body.status;
    if (req.body.managerComment !== undefined) {
        toUpdate.managerComment = req.body.managerComment;
        toUpdate.managerCheckedAt = new Date();
    }
    // recompute progress if numeric fields changed
    const progress = computeProgress(goal, { ...existing, ...req.body });
    toUpdate.progressScore = progress;
    const updated = await prisma_1.prisma.checkIn.update({ where: { id: existing.id }, data: toUpdate });
    await (0, goalRules_service_1.createAuditLog)({ goalId: goal.id, userId: user.id, action: 'CHECKIN_UPDATED' });
    res.json({ checkIn: updated });
});
exports.deleteCheckIn = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (!user)
        throw (0, errors_1.unauthorized)();
    const checkIn = await prisma_1.prisma.checkIn.findUnique({ where: { id: req.params.id } });
    if (!checkIn)
        throw (0, errors_1.badRequest)('Check-in not found');
    const goal = await prisma_1.prisma.goal.findUnique({ where: { id: checkIn.goalId } });
    if (!goal)
        throw (0, errors_1.badRequest)('Associated goal not found');
    await (0, goalRules_service_1.ensureUserCanAccessGoal)(user, goal);
    if (user.role === 'EMPLOYEE' && checkIn.userId !== user.id) {
        throw (0, errors_1.forbidden)('Employees can only delete their own check-ins');
    }
    await prisma_1.prisma.checkIn.delete({ where: { id: checkIn.id } });
    await (0, goalRules_service_1.createAuditLog)({ goalId: goal.id, userId: user.id, action: 'CHECKIN_DELETED' });
    res.status(204).send();
});
