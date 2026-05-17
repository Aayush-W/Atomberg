"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCheckIn = exports.updateCheckIn = exports.getCheckIn = exports.listGoalCheckIns = exports.createCheckIn = void 0;
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const _helpers_1 = require("./_helpers");
const goalRules_service_1 = require("../services/goalRules.service");
const cycleRules_service_1 = require("../services/cycleRules.service");
const sentiment_service_1 = require("../services/sentiment.service");
const checkinProgress_service_1 = require("../services/checkinProgress.service");
const domainEvent_service_1 = require("../services/domainEvent.service");
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
    const cycle = await (0, goalRules_service_1.getActiveCycleOrThrow)(user.tenantId, goal.cycleId);
    const cycleStatusObj = (0, cycleRules_service_1.cycleStatus)(cycle);
    const qStatus = cycleStatusObj.checkIns[req.body.quarter];
    if (!qStatus || !qStatus.isOpen) {
        throw (0, errors_1.badRequest)(`Check-in window for ${req.body.quarter} is closed`);
    }
    const progress = (0, checkinProgress_service_1.computeProgress)(goal, req.body);
    const checkIn = await prisma_1.prisma.checkIn.create({
        data: {
            tenantId: goal.tenantId,
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
    await (0, domainEvent_service_1.emitDomainEvent)({
        tenantId: user.tenantId,
        eventName: 'checkin.created',
        aggregateType: 'goal',
        aggregateId: goal.id,
        payload: {
            goalId: goal.id,
            checkInId: checkIn.id,
            actorUserId: user.id,
            progressScore: checkIn.progressScore,
            quarter: checkIn.quarter
        }
    });
    if (goal.isShared && goal.parentGoalId === null) {
        const childGoals = await prisma_1.prisma.goal.findMany({ where: { parentGoalId: goal.id } });
        if (childGoals.length > 0) {
            await prisma_1.prisma.checkIn.createMany({
                data: childGoals.map(cg => ({
                    tenantId: goal.tenantId,
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
                    tenantId: goal.tenantId,
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
    const checkIns = await prisma_1.prisma.checkIn.findMany({ where: { tenantId: user.tenantId, goalId: goal.id }, orderBy: { createdAt: 'asc' } });
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
    const cycle = await (0, goalRules_service_1.getActiveCycleOrThrow)(user.tenantId, goal.cycleId);
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
    const progress = (0, checkinProgress_service_1.computeProgress)(goal, { ...existing, ...req.body });
    toUpdate.progressScore = progress;
    toUpdate.sentiment = (0, sentiment_service_1.calculateSentimentScore)([
        req.body.employeeNote ?? existing.employeeNote,
        req.body.managerComment ?? existing.managerComment
    ]);
    const updated = await prisma_1.prisma.checkIn.update({ where: { id: existing.id }, data: toUpdate });
    await (0, goalRules_service_1.createAuditLog)({ goalId: goal.id, userId: user.id, action: 'CHECKIN_UPDATED' });
    await (0, domainEvent_service_1.emitDomainEvent)({
        tenantId: user.tenantId,
        eventName: 'checkin.updated',
        aggregateType: 'goal',
        aggregateId: goal.id,
        payload: {
            goalId: goal.id,
            checkInId: updated.id,
            actorUserId: user.id,
            progressScore: updated.progressScore,
            quarter: updated.quarter
        }
    });
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
                    tenantId: goal.tenantId,
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
    const cycle = await (0, goalRules_service_1.getActiveCycleOrThrow)(user.tenantId, goal.cycleId);
    const cycleStatusObj = (0, cycleRules_service_1.cycleStatus)(cycle);
    const qStatus = cycleStatusObj.checkIns[checkIn.quarter];
    if (!qStatus || !qStatus.isOpen) {
        throw (0, errors_1.badRequest)(`Check-in window for ${checkIn.quarter} is closed`);
    }
    await prisma_1.prisma.checkIn.delete({ where: { id: checkIn.id } });
    await (0, goalRules_service_1.createAuditLog)({ goalId: goal.id, userId: user.id, action: 'CHECKIN_DELETED' });
    await (0, domainEvent_service_1.emitDomainEvent)({
        tenantId: user.tenantId,
        eventName: 'checkin.deleted',
        aggregateType: 'goal',
        aggregateId: goal.id,
        payload: {
            goalId: goal.id,
            checkInId: checkIn.id,
            actorUserId: user.id,
            quarter: checkIn.quarter
        }
    });
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
                    tenantId: goal.tenantId,
                    goalId: cg.id,
                    userId: user.id,
                    action: 'CHECKIN_SYNCED_DELETE'
                }))
            });
        }
    }
    res.status(204).send();
});
