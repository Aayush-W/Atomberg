"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTeamsAction = exports.getTeamsCards = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const _helpers_1 = require("./_helpers");
const notifications_controller_1 = require("./notifications.controller");
const teams_service_1 = require("../services/teams.service");
const goalRules_service_1 = require("../services/goalRules.service");
exports.getTeamsCards = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.ADMIN && user.id !== req.params.managerId) {
        throw (0, errors_1.forbidden)('You can only view your own Teams cards');
    }
    const cards = await prisma_1.prisma.notification.findMany({
        where: {
            userId: req.params.managerId,
            channel: client_1.NotificationChannel.TEAMS
        },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
    res.json({ cards });
});
exports.handleTeamsAction = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    const token = typeof req.body.token === 'string' ? req.body.token : null;
    if (!token) {
        throw (0, errors_1.badRequest)('Signed action token is required');
    }
    const payload = (0, teams_service_1.verifySignedDecisionToken)(token);
    if (payload.decision !== req.params.decision) {
        throw (0, errors_1.badRequest)('Decision mismatch');
    }
    if (user.role !== client_1.Role.ADMIN && user.id !== payload.managerId) {
        throw (0, errors_1.forbidden)('This Teams action is not assigned to you');
    }
    const before = await prisma_1.prisma.goal.findUnique({
        where: { id: payload.goalId },
        include: {
            user: { select: { id: true, name: true, managerId: true } }
        }
    });
    if (!before) {
        throw (0, errors_1.badRequest)('Goal not found');
    }
    await (0, goalRules_service_1.ensureManagerCanActOnGoal)(user, before);
    if (payload.decision === 'approve') {
        await (0, goalRules_service_1.ensureGoalSheetTotals)(before.userId, before.cycleId);
    }
    const goal = await prisma_1.prisma.goal.update({
        where: { id: before.id },
        data: payload.decision === 'approve'
            ? {
                status: client_1.GoalStatus.LOCKED,
                lockedAt: new Date(),
                managerComment: req.body.comment ?? 'Approved from Microsoft Teams card'
            }
            : {
                status: client_1.GoalStatus.REJECTED,
                lockedAt: null,
                managerComment: req.body.comment ?? 'Rejected from Microsoft Teams card'
            }
    });
    await (0, goalRules_service_1.auditChangedFields)(user.id, before, goal, ['status', 'lockedAt', 'managerComment']);
    await (0, notifications_controller_1.createNotification)(before.user.id, payload.decision === 'approve' ? 'TEAMS_APPROVAL' : 'TEAMS_REJECTION', payload.decision === 'approve' ? 'Goal approved from Teams' : 'Goal returned from Teams', `Your goal "${before.title}" was ${payload.decision === 'approve' ? 'approved' : 'returned for rework'} from Microsoft Teams.`, client_1.NotificationChannel.IN_APP, { goalId: before.id, actorId: user.id });
    res.json({ goal });
});
