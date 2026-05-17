"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoal = exports.importGoalPortfolio = exports.addDependency = exports.getDependencyGraph = exports.getGoalAudit = exports.createSharedGoal = exports.unlockGoal = exports.rejectGoal = exports.approveGoal = exports.submitGoal = exports.deleteGoal = exports.updateGoal = exports.createGoal = exports.listAllGoals = exports.listTeamGoals = exports.listOwnGoals = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const notifications_controller_1 = require("./notifications.controller");
const goalRules_service_1 = require("../services/goalRules.service");
const goalConflict_service_1 = require("../services/goalConflict.service");
const teams_service_1 = require("../services/teams.service");
const domainEvent_service_1 = require("../services/domainEvent.service");
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
    kudos: true,
    dependencies: true,
    dependents: true,
    conflictAlertsA: true,
    conflictAlertsB: true
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
    if (body.sensitivity !== undefined)
        data.sensitivity = body.sensitivity;
    if (body.qualityScore !== undefined)
        data.qualityScore = body.qualityScore;
    if (body.qualityFeedback !== undefined)
        data.qualityFeedback = body.qualityFeedback;
    return data;
}
async function refreshDepartmentConflictsForGoal(goal) {
    const owner = await prisma_1.prisma.user.findUnique({
        where: { id: goal.userId },
        select: { department: true }
    });
    if (!owner) {
        return [];
    }
    const departmentGoals = await prisma_1.prisma.goal.findMany({
        where: {
            tenantId: goal.tenantId,
            cycleId: goal.cycleId,
            status: { in: [client_1.GoalStatus.SUBMITTED, client_1.GoalStatus.APPROVED, client_1.GoalStatus.LOCKED] },
            user: { department: owner.department }
        },
        select: {
            id: true,
            tenantId: true,
            cycleId: true,
            title: true,
            description: true,
            thrustArea: true,
            target: true,
            uomType: true,
            weightage: true,
            user: { select: { department: true } }
        }
    });
    return (0, goalConflict_service_1.refreshGoalConflictAlerts)(departmentGoals);
}
exports.listOwnGoals = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const cycle = await prisma_1.prisma.cycle.findFirst({
        where: { tenantId: user.tenantId, isActive: true },
        orderBy: { startDate: 'desc' }
    });
    if (!cycle) {
        return res.json({ goals: [] });
    }
    const goals = await prisma_1.prisma.goal.findMany({
        where: { tenantId: user.tenantId, userId: user.id, cycleId: cycle.id },
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
        where: user.role === client_1.Role.ADMIN ? { tenantId: user.tenantId } : { tenantId: user.tenantId, user: { managerId: user.id } },
        include: goalInclude,
        orderBy: [{ user: { name: 'asc' } }, { createdAt: 'asc' }]
    });
    res.json({ goals });
});
exports.listAllGoals = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const goals = await prisma_1.prisma.goal.findMany({
        where: { tenantId: user.tenantId },
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
    const cycle = await (0, goalRules_service_1.getActiveCycleOrThrow)(user.tenantId, req.body.cycleId);
    (0, goalRules_service_1.ensureGoalWeightage)(req.body.weightage);
    await (0, goalRules_service_1.ensureGoalPortfolioLimits)(user.id, cycle.id, { weightage: req.body.weightage });
    const goal = await prisma_1.prisma.goal.create({
        data: {
            tenantId: user.tenantId,
            userId: user.id,
            cycleId: cycle.id,
            thrustArea: req.body.thrustArea,
            title: req.body.title,
            description: req.body.description,
            uomType: req.body.uomType,
            target: req.body.target,
            targetDate: req.body.targetDate,
            weightage: req.body.weightage,
            sensitivity: req.body.sensitivity,
            qualityScore: req.body.qualityScore,
            qualityFeedback: req.body.qualityFeedback
        },
        include: goalInclude
    });
    await (0, goalRules_service_1.createAuditLog)({ goalId: goal.id, userId: user.id, action: 'GOAL_CREATED' });
    await (0, domainEvent_service_1.emitDomainEvent)({
        tenantId: user.tenantId,
        eventName: 'goal.created',
        aggregateType: 'goal',
        aggregateId: goal.id,
        payload: {
            goalId: goal.id,
            ownerUserId: goal.userId,
            title: goal.title,
            weightage: goal.weightage
        }
    });
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
    await (0, domainEvent_service_1.emitDomainEvent)({
        tenantId: user.tenantId,
        eventName: 'goal.updated',
        aggregateType: 'goal',
        aggregateId: after.id,
        payload: {
            goalId: after.id,
            actorUserId: user.id,
            title: after.title,
            status: after.status
        }
    });
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
    await refreshDepartmentConflictsForGoal(goal);
    if (goal.user.managerId) {
        const card = (0, teams_service_1.buildAdaptiveGoalApprovalCard)(goal, goal.user.managerId);
        await (0, notifications_controller_1.createNotification)(goal.user.managerId, 'APPROVAL_PENDING', `${goal.user.name} submitted goals for approval`, `Review ${goal.user.name}'s goal "${goal.title}" and approve or reject it from the Teams preview.`, client_1.NotificationChannel.TEAMS, {
            goalId: goal.id,
            employeeId: goal.user.id,
            adaptiveCard: card
        }, user.tenantId);
    }
    await (0, domainEvent_service_1.emitDomainEvent)({
        tenantId: user.tenantId,
        eventName: 'goal.submitted',
        aggregateType: 'goal',
        aggregateId: goal.id,
        payload: {
            goalId: goal.id,
            ownerUserId: goal.userId,
            managerId: goal.user.managerId,
            title: goal.title
        }
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
    await refreshDepartmentConflictsForGoal(goal);
    await (0, domainEvent_service_1.emitDomainEvent)({
        tenantId: user.tenantId,
        eventName: 'goal.approved',
        aggregateType: 'goal',
        aggregateId: goal.id,
        payload: {
            goalId: goal.id,
            actorUserId: user.id,
            ownerUserId: goal.userId,
            status: goal.status
        }
    });
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
    await refreshDepartmentConflictsForGoal(goal);
    await (0, domainEvent_service_1.emitDomainEvent)({
        tenantId: user.tenantId,
        eventName: 'goal.rejected',
        aggregateType: 'goal',
        aggregateId: goal.id,
        payload: {
            goalId: goal.id,
            actorUserId: user.id,
            ownerUserId: goal.userId,
            status: goal.status
        }
    });
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
    const cycle = await (0, goalRules_service_1.getActiveCycleOrThrow)(user.tenantId, req.body.cycleId);
    const employees = await prisma_1.prisma.user.findMany({
        where: { tenantId: user.tenantId, id: { in: uniqueEmployeeIds }, role: client_1.Role.EMPLOYEE },
        select: { id: true }
    });
    if (employees.length !== uniqueEmployeeIds.length) {
        throw (0, errors_1.badRequest)('All shared goal recipients must be valid employees');
    }
    await Promise.all(uniqueEmployeeIds.map((employeeId) => (0, goalRules_service_1.ensureGoalPortfolioLimits)(employeeId, cycle.id, { weightage: req.body.weightage })));
    const [primaryEmployeeId, ...childEmployeeIds] = uniqueEmployeeIds;
    const parentGoal = await prisma_1.prisma.goal.create({
        data: {
            tenantId: user.tenantId,
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
            sensitivity: req.body.sensitivity,
            qualityScore: req.body.qualityScore,
            qualityFeedback: req.body.qualityFeedback
        }
    });
    const childGoals = await Promise.all(childEmployeeIds.map((employeeId) => prisma_1.prisma.goal.create({
        data: {
            tenantId: user.tenantId,
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
            sensitivity: req.body.sensitivity,
            qualityScore: req.body.qualityScore,
            qualityFeedback: req.body.qualityFeedback
        }
    })));
    await (0, goalRules_service_1.createAuditLog)({ goalId: parentGoal.id, userId: user.id, action: 'SHARED_GOAL_CREATED' });
    await Promise.all(childGoals.map((goal) => (0, goalRules_service_1.createAuditLog)({ goalId: goal.id, userId: user.id, action: 'SHARED_GOAL_CREATED' })));
    const goals = await prisma_1.prisma.goal.findMany({
        where: { tenantId: user.tenantId, id: { in: [parentGoal.id, ...childGoals.map((goal) => goal.id)] } },
        include: goalInclude
    });
    res.status(201).json({ goals });
});
exports.getGoalAudit = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const goal = await findGoalOrThrow(req.params.id);
    await (0, goalRules_service_1.ensureUserCanAccessGoal)(user, goal);
    const auditLogs = await prisma_1.prisma.auditLog.findMany({
        where: { tenantId: user.tenantId, goalId: goal.id },
        include: { user: { select: { id: true, email: true, name: true, role: true } } },
        orderBy: { timestamp: 'desc' }
    });
    res.json({ auditLogs });
});
exports.getDependencyGraph = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const goalWhere = user.role === client_1.Role.ADMIN
        ? { tenantId: user.tenantId }
        : user.role === client_1.Role.MANAGER
            ? { tenantId: user.tenantId, user: { managerId: user.id } }
            : { tenantId: user.tenantId, userId: user.id };
    const goals = await prisma_1.prisma.goal.findMany({
        where: goalWhere,
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
    const userIds = new Set();
    goals.forEach((goal) => {
        userIds.add(goal.user.id);
        if (goal.user.managerId) {
            userIds.add(goal.user.managerId);
        }
    });
    if (user.managerId) {
        userIds.add(user.managerId);
    }
    userIds.add(user.id);
    const users = await prisma_1.prisma.user.findMany({
        where: { tenantId: user.tenantId, id: { in: [...userIds] } },
        select: {
            id: true,
            name: true,
            role: true,
            department: true,
            managerId: true
        }
    });
    const goalNodes = goals.map((goal) => ({
        id: `goal:${goal.id}`,
        kind: 'goal',
        entityId: goal.id,
        title: goal.title,
        subtitle: goal.thrustArea,
        ownerName: goal.user.name,
        status: goal.status,
        progressScore: goal.checkIns.at(-1)?.progressScore ?? 0,
        isShared: goal.isShared,
        parentGoalId: goal.parentGoalId
    }));
    const userNodes = users.map((person) => ({
        id: `user:${person.id}`,
        kind: 'user',
        entityId: person.id,
        title: person.name,
        subtitle: `${person.role} · ${person.department}`,
        ownerName: person.name,
        status: person.role,
        progressScore: 0,
        isShared: false,
        parentGoalId: null
    }));
    const links = [
        ...users
            .filter((person) => person.managerId && userIds.has(person.managerId))
            .map((person) => ({
            id: `org:${person.managerId}:${person.id}`,
            source: `user:${person.managerId}`,
            target: `user:${person.id}`,
            type: 'org'
        })),
        ...goals.map((goal) => ({
            id: `owner:${goal.userId}:${goal.id}`,
            source: `user:${goal.userId}`,
            target: `goal:${goal.id}`,
            type: 'ownership'
        })),
        ...goals
            .filter((goal) => goal.parentGoalId)
            .map((goal) => ({
            id: `shared:${goal.parentGoalId}:${goal.id}`,
            source: `goal:${goal.parentGoalId}`,
            target: `goal:${goal.id}`,
            type: 'shared'
        })),
        ...dependencies.map((dependency) => ({
            id: `dep:${dependency.requiredGoalId}:${dependency.dependentGoalId}`,
            source: `goal:${dependency.requiredGoalId}`,
            target: `goal:${dependency.dependentGoalId}`,
            type: 'dependency'
        }))
    ];
    res.json({
        goals: goals.map((goal) => ({
            ...goal,
            progressScore: goal.checkIns.at(-1)?.progressScore ?? 0
        })),
        dependencies,
        nodes: [...userNodes, ...goalNodes],
        links
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
            tenantId: user.tenantId,
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
exports.importGoalPortfolio = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    if (user.role !== client_1.Role.EMPLOYEE) {
        throw (0, errors_1.forbidden)('Only employees can import their own portfolio');
    }
    const goals = Array.isArray(req.body.goals) ? req.body.goals : [];
    if (goals.length !== 5) {
        throw (0, errors_1.badRequest)('Portfolio import expects exactly 5 goals');
    }
    const cycle = await (0, goalRules_service_1.getActiveCycleOrThrow)(user.tenantId, req.body.cycleId);
    const existing = await prisma_1.prisma.goal.findMany({
        where: { tenantId: user.tenantId, userId: user.id, cycleId: cycle.id }
    });
    if (existing.some((goal) => goal.status !== client_1.GoalStatus.DRAFT && goal.status !== client_1.GoalStatus.REJECTED)) {
        throw (0, errors_1.badRequest)('Portfolio import is only available before any goals are submitted or approved');
    }
    const totalWeightage = goals.reduce((sum, goal) => sum + goal.weightage, 0);
    if (Math.abs(totalWeightage - 100) > 0.001) {
        throw (0, errors_1.badRequest)('Imported goals must sum to exactly 100% weightage');
    }
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.goal.deleteMany({
            where: { tenantId: user.tenantId, userId: user.id, cycleId: cycle.id, status: { in: [client_1.GoalStatus.DRAFT, client_1.GoalStatus.REJECTED] } }
        });
        for (const goal of goals) {
            (0, goalRules_service_1.ensureGoalWeightage)(goal.weightage);
            await tx.goal.create({
                data: {
                    tenantId: user.tenantId,
                    userId: user.id,
                    cycleId: cycle.id,
                    thrustArea: goal.thrustArea,
                    title: goal.title,
                    description: goal.description,
                    uomType: goal.uomType,
                    target: goal.target,
                    targetDate: goal.targetDate,
                    weightage: goal.weightage,
                    sensitivity: goal.sensitivity,
                    qualityFeedback: {
                        source: 'goal-autopilot',
                        rationale: goal.rationale ?? null
                    }
                }
            });
        }
    });
    const importedGoals = await prisma_1.prisma.goal.findMany({
        where: { tenantId: user.tenantId, userId: user.id, cycleId: cycle.id },
        include: goalInclude,
        orderBy: { createdAt: 'asc' }
    });
    res.status(201).json({ goals: importedGoals });
});
exports.getGoal = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = currentUser(req);
    const goal = await findGoalOrThrow(req.params.id);
    await (0, goalRules_service_1.ensureUserCanAccessGoal)(user, goal);
    res.json({ goal });
});
