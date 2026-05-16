"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDependency = exports.getDependencyGraph = exports.getGoalAudit = exports.createSharedGoal = exports.unlockGoal = exports.rejectGoal = exports.approveGoal = exports.submitGoal = exports.deleteGoal = exports.updateGoal = exports.createGoal = exports.listAllGoals = exports.listTeamGoals = exports.listOwnGoals = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const goalRules_service_1 = require("../services/goalRules.service");
const goalInclude = {
    user: {
        select: {
            id: true,
            name: true,
            email: true,
            department: true,
            managerId: true
        }
    },
    cycle: true,
    checkIns: true,
    dependencies: true,
    dependents: true
};
function currentUser(req) {
    if (!req.user) {
        throw (0, errors_1.unauthorized)();
    }
    return req.user;
}
async function findGoalOrThrow(id) {
    const goal = await prisma_1.prisma.goal.findUnique({ where: { id } });
    if (!goal) {
        throw (0, errors_1.badRequest)('Goal not found');
    }
    return goal;
}
function ensureGoalEditableByOwner(userId, goal) {
    if (goal.userId !== userId) {
        throw (0, errors_1.forbidden)('Employees can only edit their own goals');
    }
    if (goal.lockedAt || goal.status === client_1.GoalStatus.LOCKED) {
        throw (0, errors_1.forbidden)('Goal is locked. Contact admin to unlock.');
    }
    if (goal.status !== client_1.GoalStatus.DRAFT && goal.status !== client_1.GoalStatus.REJECTED) {
        throw (0, errors_1.forbidden)('Only draft or rejected goals can be edited before submission');
    }
}
function ensureSharedGoalFieldsCanChange(goal, body) {
    if (!goal.isShared) {
        return;
    }
    const blockedFields = ['title', 'description', 'thrustArea', 'uomType', 'target', 'targetDate'];
    const attempted = blockedFields.filter((field) => body[field] !== undefined);
    if (attempted.length > 0) {
        throw (0, errors_1.forbidden)('Shared goal title, description, thrust area, UoM, target, and target date cannot be edited by recipients');
    }
}
function updateGoalData(body) {
    const data = {};
    if (body.thrustArea !== undefined)
        data.thrustArea = body.thrustArea;
    if (body.title !== undefined)
        data.title = body.title;
    if (body.description !== undefined)
        data.description = body.description;
    if (body.uomType !== undefined)
        data.uomType = body.uomType;
    if (body.target !== undefined)
        data.target = body.target;
    if (body.targetDate !== undefined)
        data.targetDate = body.targetDate;
    if (body.weightage !== undefined)
        data.weightage = body.weightage;
    if (body.qualityScore !== undefined)
        data.qualityScore = body.qualityScore;
    if (body.qualityFeedback !== undefined)
        data.qualityFeedback = body.qualityFeedback;
    return data;
}
exports.listOwnGoals = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const cycle = await (0, goalRules_service_1.getActiveCycleOrThrow)();
    const goals = await prisma_1.prisma.goal.findMany({
        where: { userId: user.id, cycleId: cycle.id },
        include: goalInclude,
        orderBy: { createdAt: 'asc' }
    });
    res.json({ goals });
});
exports.listTeamGoals = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    if (user.role !== client_1.Role.MANAGER && user.role !== client_1.Role.ADMIN) {
        throw (0, errors_1.forbidden)('Only managers and admins can view team goals');
    }
    const goals = await prisma_1.prisma.goal.findMany({
        where: user.role === client_1.Role.ADMIN ? undefined : { user: { managerId: user.id } },
        include: goalInclude,
        orderBy: [{ user: { name: 'asc' } }, { createdAt: 'asc' }]
    });
    res.json({ goals });
});
exports.listAllGoals = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const goals = await prisma_1.prisma.goal.findMany({
        include: goalInclude,
        orderBy: [{ user: { department: 'asc' } }, { user: { name: 'asc' } }, { createdAt: 'asc' }]
    });
    res.json({ goals });
});
exports.createGoal = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    if (user.role !== client_1.Role.EMPLOYEE) {
        throw (0, errors_1.forbidden)('Only employees can create their own goals');
    }
    const cycle = await (0, goalRules_service_1.getActiveCycleOrThrow)(req.body.cycleId);
    (0, goalRules_service_1.ensureGoalWeightage)(req.body.weightage);
    await (0, goalRules_service_1.ensureGoalPortfolioLimits)(user.id, cycle.id, { weightage: req.body.weightage });
    const goal = await prisma_1.prisma.goal.create({
        data: {
            userId: user.id,
            cycleId: cycle.id,
            thrustArea: req.body.thrustArea,
            title: req.body.title,
            description: req.body.description,
            uomType: req.body.uomType,
            target: req.body.target,
            targetDate: req.body.targetDate,
            weightage: req.body.weightage,
            qualityScore: req.body.qualityScore,
            qualityFeedback: req.body.qualityFeedback
        },
        include: goalInclude
    });
    await (0, goalRules_service_1.createAuditLog)({ goalId: goal.id, userId: user.id, action: 'GOAL_CREATED' });
    res.status(201).json({ goal });
});
exports.updateGoal = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const before = await findGoalOrThrow(req.params.id);
    ensureGoalEditableByOwner(user.id, before);
    ensureSharedGoalFieldsCanChange(before, req.body);
    if (req.body.weightage !== undefined) {
        await (0, goalRules_service_1.ensureGoalPortfolioLimits)(before.userId, before.cycleId, { id: before.id, weightage: req.body.weightage });
    }
    const after = await prisma_1.prisma.goal.update({
        where: { id: before.id },
        data: updateGoalData(req.body),
        include: goalInclude
    });
    await (0, goalRules_service_1.auditChangedFields)(user.id, before, after, [
        'thrustArea',
        'title',
        'description',
        'uomType',
        'target',
        'targetDate',
        'weightage'
    ]);
    res.json({ goal: after });
});
exports.deleteGoal = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const goal = await findGoalOrThrow(req.params.id);
    if (goal.userId !== user.id) {
        throw (0, errors_1.forbidden)('Employees can only delete their own goals');
    }
    if (goal.status !== client_1.GoalStatus.DRAFT) {
        throw (0, errors_1.forbidden)('Only draft goals can be deleted');
    }
    await prisma_1.prisma.goal.delete({ where: { id: goal.id } });
    res.status(204).send();
});
exports.submitGoal = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const before = await findGoalOrThrow(req.params.id);
    ensureGoalEditableByOwner(user.id, before);
    await (0, goalRules_service_1.ensureGoalSheetTotals)(before.userId, before.cycleId);
    const goal = await prisma_1.prisma.goal.update({
        where: { id: before.id },
        data: { status: client_1.GoalStatus.SUBMITTED },
        include: goalInclude
    });
    await (0, goalRules_service_1.createAuditLog)({
        goalId: goal.id,
        userId: user.id,
        action: 'GOAL_SUBMITTED',
        field: 'status',
        oldValue: before.status,
        newValue: client_1.GoalStatus.SUBMITTED
    });
    res.json({ goal });
});
exports.approveGoal = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const before = await findGoalOrThrow(req.params.id);
    await (0, goalRules_service_1.ensureManagerCanActOnGoal)(user, before);
    if (before.status !== client_1.GoalStatus.SUBMITTED && before.status !== client_1.GoalStatus.APPROVED) {
        throw (0, errors_1.badRequest)('Only submitted goals can be approved');
    }
    await (0, goalRules_service_1.ensureGoalSheetTotals)(before.userId, before.cycleId);
    const goal = await prisma_1.prisma.goal.update({
        where: { id: before.id },
        data: {
            status: client_1.GoalStatus.LOCKED,
            lockedAt: new Date(),
            managerComment: req.body.comment
        },
        include: goalInclude
    });
    await (0, goalRules_service_1.auditChangedFields)(user.id, before, goal, ['status', 'lockedAt', 'managerComment']);
    res.json({ goal });
});
exports.rejectGoal = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const before = await findGoalOrThrow(req.params.id);
    await (0, goalRules_service_1.ensureManagerCanActOnGoal)(user, before);
    if (before.status !== client_1.GoalStatus.SUBMITTED) {
        throw (0, errors_1.badRequest)('Only submitted goals can be rejected');
    }
    const goal = await prisma_1.prisma.goal.update({
        where: { id: before.id },
        data: {
            status: client_1.GoalStatus.REJECTED,
            managerComment: req.body.comment,
            lockedAt: null
        },
        include: goalInclude
    });
    await (0, goalRules_service_1.auditChangedFields)(user.id, before, goal, ['status', 'managerComment', 'lockedAt']);
    res.json({ goal });
});
exports.unlockGoal = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const before = await findGoalOrThrow(req.params.id);
    const goal = await prisma_1.prisma.goal.update({
        where: { id: before.id },
        data: {
            status: client_1.GoalStatus.APPROVED,
            lockedAt: null
        },
        include: goalInclude
    });
    await (0, goalRules_service_1.auditChangedFields)(user.id, before, goal, ['status', 'lockedAt']);
    res.json({ goal });
});
exports.createSharedGoal = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const uniqueEmployeeIds = [...new Set(req.body.employeeIds)];
    await (0, goalRules_service_1.ensureCanPushSharedGoal)(user, uniqueEmployeeIds);
    const cycle = await (0, goalRules_service_1.getActiveCycleOrThrow)(req.body.cycleId);
    const employees = await prisma_1.prisma.user.findMany({
        where: { id: { in: uniqueEmployeeIds }, role: client_1.Role.EMPLOYEE },
        select: { id: true }
    });
    if (employees.length !== uniqueEmployeeIds.length) {
        throw (0, errors_1.badRequest)('All shared goal recipients must be valid employees');
    }
    await Promise.all(uniqueEmployeeIds.map((employeeId) => (0, goalRules_service_1.ensureGoalPortfolioLimits)(employeeId, cycle.id, { weightage: req.body.weightage })));
    const [primaryEmployeeId, ...childEmployeeIds] = uniqueEmployeeIds;
    const parentGoal = await prisma_1.prisma.goal.create({
        data: {
            userId: primaryEmployeeId,
            cycleId: cycle.id,
            thrustArea: req.body.thrustArea,
            title: req.body.title,
            description: req.body.description,
            uomType: req.body.uomType,
            target: req.body.target,
            targetDate: req.body.targetDate,
            weightage: req.body.weightage,
            isShared: false,
            qualityScore: req.body.qualityScore,
            qualityFeedback: req.body.qualityFeedback
        }
    });
    const childGoals = await Promise.all(childEmployeeIds.map((employeeId) => prisma_1.prisma.goal.create({
        data: {
            userId: employeeId,
            cycleId: cycle.id,
            thrustArea: req.body.thrustArea,
            title: req.body.title,
            description: req.body.description,
            uomType: req.body.uomType,
            target: req.body.target,
            targetDate: req.body.targetDate,
            weightage: req.body.weightage,
            isShared: true,
            parentGoalId: parentGoal.id,
            qualityScore: req.body.qualityScore,
            qualityFeedback: req.body.qualityFeedback
        }
    })));
    await (0, goalRules_service_1.createAuditLog)({ goalId: parentGoal.id, userId: user.id, action: 'SHARED_GOAL_CREATED' });
    await Promise.all(childGoals.map((goal) => (0, goalRules_service_1.createAuditLog)({ goalId: goal.id, userId: user.id, action: 'SHARED_GOAL_CREATED' })));
    const goals = await prisma_1.prisma.goal.findMany({
        where: { id: { in: [parentGoal.id, ...childGoals.map((goal) => goal.id)] } },
        include: goalInclude
    });
    res.status(201).json({ goals });
});
exports.getGoalAudit = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const goal = await findGoalOrThrow(req.params.id);
    await (0, goalRules_service_1.ensureUserCanAccessGoal)(user, goal);
    const auditLogs = await prisma_1.prisma.auditLog.findMany({
        where: { goalId: goal.id },
        include: { user: { select: { id: true, email: true, name: true, role: true } } },
        orderBy: { timestamp: 'desc' }
    });
    res.json({ auditLogs });
});
exports.getDependencyGraph = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const where = user.role === client_1.Role.ADMIN
        ? {}
        : user.role === client_1.Role.MANAGER
            ? { user: { managerId: user.id } }
            : { userId: user.id };
    const goals = await prisma_1.prisma.goal.findMany({
        where,
        include: {
            user: { select: { id: true, name: true, department: true, managerId: true } },
            checkIns: true,
            dependencies: true,
            dependents: true
        },
        orderBy: [{ user: { name: 'asc' } }, { createdAt: 'asc' }]
    });
    const goalIds = goals.map((goal) => goal.id);
    const dependencies = await prisma_1.prisma.goalDependency.findMany({
        where: {
            dependentGoalId: { in: goalIds },
            requiredGoalId: { in: goalIds }
        }
    });
    res.json({
        nodes: goals.map((goal) => ({
            id: goal.id,
            employeeName: goal.user.name,
            department: goal.user.department,
            title: goal.title,
            thrustArea: goal.thrustArea,
            status: goal.status,
            isShared: goal.isShared,
            progressScore: goal.checkIns.at(-1)?.progressScore ?? 0
        })),
        edges: dependencies.map((dependency) => ({
            id: dependency.id,
            source: dependency.requiredGoalId,
            target: dependency.dependentGoalId
        }))
    });
});
exports.addDependency = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const dependentGoal = await findGoalOrThrow(req.params.id);
    const requiredGoal = await findGoalOrThrow(req.body.requiredGoalId);
    await (0, goalRules_service_1.ensureUserCanAccessGoal)(user, dependentGoal);
    await (0, goalRules_service_1.ensureUserCanAccessGoal)(user, requiredGoal);
    if (dependentGoal.id === requiredGoal.id) {
        throw (0, errors_1.badRequest)('A goal cannot depend on itself');
    }
    const dependency = await prisma_1.prisma.goalDependency.create({
        data: {
            dependentGoalId: dependentGoal.id,
            requiredGoalId: requiredGoal.id
        }
    });
    await (0, goalRules_service_1.createAuditLog)({
        goalId: dependentGoal.id,
        userId: user.id,
        action: 'DEPENDENCY_ADDED',
        field: 'requiredGoalId',
        newValue: requiredGoal.id
    });
    res.status(201).json({ dependency });
});
