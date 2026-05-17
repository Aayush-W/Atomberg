"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCheckIn = exports.updateCheckIn = exports.getCheckIn = exports.listGoalCheckIns = exports.createCheckIn = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const _helpers_1 = require("./_helpers");
const goalRules_service_1 = require("../services/goalRules.service");
const cycleRules_service_1 = require("../services/cycleRules.service");
const sentiment_service_1 = require("../services/sentiment.service");
function computeProgress(goal, input) {
    const uom = goal.uomType;
    const actual = typeof input.actualValue === 'number' ? input.actualValue : 0;
    if (uom === client_1.UoMType.MAX) {
        if (!goal.target || goal.target === 0 || actual === 0)
            return actual === 0 ? 100 : 0;
        return Math.round((goal.target / actual) * 100);
    }
    if (uom === client_1.UoMType.MIN) {
        if (!goal.target || goal.target === 0)
            return 0;
        return Math.round((actual / goal.target) * 100);
    }
    if (uom === client_1.UoMType.TIMELINE) {
        const completion = input.completionDate;
        if (!goal.targetDate)
            return 0;
        if (!completion)
            return 0;
        const diff = Math.floor((goal.targetDate.getTime() - new Date(completion).getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0)
            return 100;
        return Math.max(0, 100 + diff * 2);
    }
    if (uom === client_1.UoMType.ZERO) {
        return actual === 0 ? 100 : 0;
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
    if (goal.isShared && goal.parentGoalId !== null && user.role === 'EMPLOYEE') {
        throw (0, errors_1.forbidden)('Employees cannot directly create check-ins for shared child goals');
    }
    const cycle = await (0, goalRules_service_1.getActiveCycleOrThrow)(goal.cycleId);
    const cycleStatusObj = (0, cycleRules_service_1.cycleStatus)(cycle);
    const qStatus = cycleStatusObj.checkIns[req.body.quarter];
    if (!qStatus || !qStatus.isOpen) {
        throw (0, errors_1.badRequest)(`Check-in window for ${req.body.quarter} is closed`);
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
            progressScore: progress,
            employeeNote: req.body.employeeNote ?? null,
            sentiment: (0, sentiment_service_1.calculateSentimentScore)([req.body.employeeNote])
        }
    });
    await (0, goalRules_service_1.createAuditLog)({ goalId: goal.id, userId: user.id, action: 'CHECKIN_CREATED' });
    if (goal.isShared && goal.parentGoalId === null) {
        const childGoals = await prisma_1.prisma.goal.findMany({ where: { parentGoalId: goal.id } });
        if (childGoals.length > 0) {
            await prisma_1.prisma.checkIn.createMany({
                data: childGoals.map(cg => ({
                    goalId: cg.id,
                    userId: cg.userId,
                    quarter: req.body.quarter,
                    actualValue: req.body.actualValue,
                    completionDate: req.body.completionDate ?? null,
                    status: req.body.status ?? 'ON_TRACK',
                    progressScore: progress,
                    employeeNote: req.body.employeeNote ?? null,
                    sentiment: (0, sentiment_service_1.calculateSentimentScore)([req.body.employeeNote])
                }))
            });
            await prisma_1.prisma.auditLog.createMany({
                data: childGoals.map(cg => ({
                    goalId: cg.id,
                    userId: user.id,
                    action: 'CHECKIN_SYNCED'
                }))
            });
        }
    }
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
    if (goal.isShared && goal.parentGoalId !== null && user.role === 'EMPLOYEE') {
        throw (0, errors_1.forbidden)('Employees cannot directly update check-ins for shared child goals');
    }
    const cycle = await (0, goalRules_service_1.getActiveCycleOrThrow)(goal.cycleId);
    const cycleStatusObj = (0, cycleRules_service_1.cycleStatus)(cycle);
    const qStatus = cycleStatusObj.checkIns[existing.quarter];
    if (!qStatus || !qStatus.isOpen) {
        throw (0, errors_1.badRequest)(`Check-in window for ${existing.quarter} is closed`);
    }
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
    if (req.body.employeeNote !== undefined) {
        toUpdate.employeeNote = req.body.employeeNote;
    }
    if (req.body.managerComment !== undefined) {
        toUpdate.managerComment = req.body.managerComment;
        toUpdate.managerCheckedAt = new Date();
    }
    // recompute progress if numeric fields changed
    const progress = computeProgress(goal, { ...existing, ...req.body });
    toUpdate.progressScore = progress;
    toUpdate.sentiment = (0, sentiment_service_1.calculateSentimentScore)([
        req.body.employeeNote ?? existing.employeeNote,
        req.body.managerComment ?? existing.managerComment
    ]);
    const updated = await prisma_1.prisma.checkIn.update({ where: { id: existing.id }, data: toUpdate });
    await (0, goalRules_service_1.createAuditLog)({ goalId: goal.id, userId: user.id, action: 'CHECKIN_UPDATED' });
    if (goal.isShared && goal.parentGoalId === null) {
        const childGoals = await prisma_1.prisma.goal.findMany({ where: { parentGoalId: goal.id } });
        if (childGoals.length > 0) {
            await prisma_1.prisma.checkIn.updateMany({
                where: {
                    goalId: { in: childGoals.map(cg => cg.id) },
                    quarter: existing.quarter
                },
                data: {
                    actualValue: toUpdate.actualValue,
                    completionDate: toUpdate.completionDate,
                    status: toUpdate.status,
                    progressScore: toUpdate.progressScore,
                    employeeNote: toUpdate.employeeNote,
                    sentiment: toUpdate.sentiment
                }
            });
            await prisma_1.prisma.auditLog.createMany({
                data: childGoals.map(cg => ({
                    goalId: cg.id,
                    userId: user.id,
                    action: 'CHECKIN_SYNCED'
                }))
            });
        }
    }
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
    if (goal.isShared && goal.parentGoalId !== null && user.role === 'EMPLOYEE') {
        throw (0, errors_1.forbidden)('Employees cannot directly delete check-ins for shared child goals');
    }
    const cycle = await (0, goalRules_service_1.getActiveCycleOrThrow)(goal.cycleId);
    const cycleStatusObj = (0, cycleRules_service_1.cycleStatus)(cycle);
    const qStatus = cycleStatusObj.checkIns[checkIn.quarter];
    if (!qStatus || !qStatus.isOpen) {
        throw (0, errors_1.badRequest)(`Check-in window for ${checkIn.quarter} is closed`);
    }
    await prisma_1.prisma.checkIn.delete({ where: { id: checkIn.id } });
    await (0, goalRules_service_1.createAuditLog)({ goalId: goal.id, userId: user.id, action: 'CHECKIN_DELETED' });
    if (goal.isShared && goal.parentGoalId === null) {
        const childGoals = await prisma_1.prisma.goal.findMany({ where: { parentGoalId: goal.id } });
        if (childGoals.length > 0) {
            await prisma_1.prisma.checkIn.deleteMany({
                where: {
                    goalId: { in: childGoals.map(cg => cg.id) },
                    quarter: checkIn.quarter
                }
            });
            await prisma_1.prisma.auditLog.createMany({
                data: childGoals.map(cg => ({
                    goalId: cg.id,
                    userId: user.id,
                    action: 'CHECKIN_SYNCED_DELETE'
                }))
            });
        }
    }
    res.status(204).send();
});
