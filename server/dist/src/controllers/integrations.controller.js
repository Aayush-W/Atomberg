"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDomainEvents = exports.getPlatformOverview = exports.updateFeatureFlag = exports.getFeatureFlags = exports.getWebhookDeliveries = exports.testWebhookEndpoint = exports.createWebhookEndpoint = exports.listWebhookEndpoints = exports.handleChatOpsCommand = exports.simulateExternalSync = exports.receiveExternalWebhook = exports.handleTeamsAction = exports.getTeamsCards = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const _helpers_1 = require("./_helpers");
const notifications_controller_1 = require("./notifications.controller");
const teams_service_1 = require("../services/teams.service");
const goalRules_service_1 = require("../services/goalRules.service");
const integration_service_1 = require("../services/integration.service");
const checkinProgress_service_1 = require("../services/checkinProgress.service");
const ai_service_1 = require("../services/ai.service");
const domainEvent_service_1 = require("../services/domainEvent.service");
const idempotency_service_1 = require("../services/idempotency.service");
const featureFlag_service_1 = require("../services/featureFlag.service");
exports.getTeamsCards = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.ADMIN && user.id !== req.params.managerId) {
        throw (0, errors_1.forbidden)('You can only view your own Teams cards');
    }
    const cards = await prisma_1.prisma.notification.findMany({
        where: {
            tenantId: user.tenantId,
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
    await (0, notifications_controller_1.createNotification)(before.user.id, payload.decision === 'approve' ? 'TEAMS_APPROVAL' : 'TEAMS_REJECTION', payload.decision === 'approve' ? 'Goal approved from Teams' : 'Goal returned from Teams', `Your goal "${before.title}" was ${payload.decision === 'approve' ? 'approved' : 'returned for rework'} from Microsoft Teams.`, client_1.NotificationChannel.IN_APP, { goalId: before.id, actorId: user.id }, user.tenantId);
    await (0, domainEvent_service_1.emitDomainEvent)({
        tenantId: user.tenantId,
        eventName: payload.decision === 'approve' ? 'goal.approved' : 'goal.rejected',
        aggregateType: 'goal',
        aggregateId: goal.id,
        payload: {
            goalId: goal.id,
            title: before.title,
            actorUserId: user.id,
            status: goal.status
        }
    });
    res.json({ goal });
});
function readWebhookSecret(req) {
    return req.header('x-goalforge-webhook-secret') ?? req.header('x-webhook-secret') ?? '';
}
function parseQuarter(value) {
    if (value === 'Q1' || value === 'Q2' || value === 'Q3' || value === 'Q4')
        return value;
    return undefined;
}
async function syncPayloadFromRequest(provider, body, actorUserId) {
    const goalId = typeof body.goalId === 'string' ? body.goalId : null;
    if (!goalId) {
        throw (0, errors_1.badRequest)('goalId is required');
    }
    const incrementBy = typeof body.incrementBy === 'number' ? body.incrementBy : 1;
    const actualValue = typeof body.actualValue === 'number' ? body.actualValue : undefined;
    const status = body.status === client_1.CheckInStatus.COMPLETED || body.status === client_1.CheckInStatus.NOT_STARTED || body.status === client_1.CheckInStatus.ON_TRACK
        ? body.status
        : undefined;
    return (0, integration_service_1.applyGoalProgressSync)({
        provider,
        goalId,
        quarter: parseQuarter(body.quarter),
        incrementBy,
        actualValue,
        status,
        eventTitle: typeof body.eventTitle === 'string' ? body.eventTitle : undefined,
        note: typeof body.note === 'string' ? body.note : undefined,
        actorUserId
    });
}
async function resolveInboundTenant(req) {
    const tenantSlug = req.header('x-goalforge-tenant') ?? req.header('x-tenant-slug');
    if (!tenantSlug) {
        throw (0, errors_1.badRequest)('x-goalforge-tenant header is required');
    }
    const tenant = await prisma_1.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
        throw (0, errors_1.badRequest)('Tenant not found for inbound webhook');
    }
    if (readWebhookSecret(req) !== tenant.webhookSecret) {
        throw (0, errors_1.forbidden)('Invalid webhook secret');
    }
    return tenant;
}
exports.receiveExternalWebhook = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const tenant = await resolveInboundTenant(req);
    const idempotencyKey = req.header('idempotency-key');
    const routeFingerprint = `incoming-webhook:${tenant.slug}:${req.params.provider}`;
    if (idempotencyKey) {
        const existing = await (0, idempotency_service_1.getIdempotentResponse)(tenant.id, idempotencyKey, routeFingerprint);
        if (existing) {
            return res.status(existing.statusCode).json(existing.responseBody);
        }
    }
    const result = await syncPayloadFromRequest(req.params.provider, req.body);
    if (result.goal.tenantId !== tenant.id) {
        throw (0, errors_1.forbidden)('Goal does not belong to the supplied tenant');
    }
    await (0, domainEvent_service_1.emitDomainEvent)({
        tenantId: tenant.id,
        eventName: 'integration.sync.received',
        aggregateType: 'goal',
        aggregateId: result.goal.id,
        payload: {
            provider: req.params.provider,
            goalId: result.goal.id,
            checkInId: result.checkIn.id,
            progressScore: result.progressScore
        }
    });
    if (idempotencyKey) {
        await (0, idempotency_service_1.storeIdempotentResponse)({
            tenantId: tenant.id,
            idempotencyKey,
            routeFingerprint,
            statusCode: 200,
            responseBody: result
        });
    }
    res.json(result);
});
exports.simulateExternalSync = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    const result = await syncPayloadFromRequest(req.params.provider, req.body, user.id);
    if (result.goal.tenantId !== user.tenantId) {
        throw (0, errors_1.forbidden)('Goal is outside your tenant');
    }
    await (0, domainEvent_service_1.emitDomainEvent)({
        tenantId: user.tenantId,
        eventName: 'integration.sync.simulated',
        aggregateType: 'goal',
        aggregateId: result.goal.id,
        payload: {
            provider: req.params.provider,
            actorUserId: user.id,
            goalId: result.goal.id,
            progressScore: result.progressScore
        }
    });
    res.json(result);
});
exports.handleChatOpsCommand = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    const command = typeof req.body.command === 'string' ? req.body.command.trim() : '';
    const platform = typeof req.body.platform === 'string' ? req.body.platform : 'teams';
    if (!command) {
        throw (0, errors_1.badRequest)('command is required');
    }
    const where = user.role === client_1.Role.ADMIN
        ? { tenantId: user.tenantId }
        : user.role === client_1.Role.MANAGER
            ? {
                tenantId: user.tenantId,
                OR: [{ userId: user.id }, { user: { managerId: user.id } }]
            }
            : { tenantId: user.tenantId, userId: user.id };
    const goals = await prisma_1.prisma.goal.findMany({
        where,
        include: {
            cycle: true,
            checkIns: { orderBy: { createdAt: 'asc' } }
        },
        orderBy: { createdAt: 'asc' }
    });
    const parsed = await (0, ai_service_1.parseChatOpsCommand)(command, goals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        target: goal.target,
        uomType: goal.uomType,
        latestActualValue: goal.checkIns.at(-1)?.actualValue
    })));
    if (!parsed.goalId || parsed.intent === 'unknown') {
        return res.json({
            platform,
            message: `I could not map that command to a goal. Try: "Update my sales goal to 10000" or "Log progress on close tickets to 42".`,
            parsed
        });
    }
    const goal = goals.find((item) => item.id === parsed.goalId);
    if (!goal) {
        throw (0, errors_1.badRequest)('Goal not found for parsed command');
    }
    if (parsed.intent === 'update_target' && typeof parsed.value === 'number') {
        const updatedGoal = await prisma_1.prisma.goal.update({
            where: { id: goal.id },
            data: { target: parsed.value }
        });
        const latest = goal.checkIns.at(-1);
        const progressScore = latest
            ? (0, checkinProgress_service_1.computeProgress)(updatedGoal, { actualValue: latest.actualValue, completionDate: latest.completionDate })
            : 0;
        await (0, domainEvent_service_1.emitDomainEvent)({
            tenantId: user.tenantId,
            eventName: 'goal.updated',
            aggregateType: 'goal',
            aggregateId: updatedGoal.id,
            payload: {
                source: 'chatops',
                platform,
                actorUserId: user.id,
                target: updatedGoal.target
            }
        });
        return res.json({
            platform,
            parsed,
            goal: updatedGoal,
            message: (0, integration_service_1.buildChatOpsReply)({ goal: updatedGoal, progressScore, actionLabel: 'Updated target for' })
        });
    }
    const quarter = parseQuarter(req.body.quarter) ?? (0, checkinProgress_service_1.quarterFromDate)(goal.cycle.startDate, new Date());
    const existing = goal.checkIns.find((entry) => entry.quarter === quarter);
    const nextActual = parsed.intent === 'log_progress' && typeof parsed.value === 'number'
        ? parsed.value
        : existing?.actualValue ?? 0;
    const nextProgress = (0, checkinProgress_service_1.computeProgress)(goal, { actualValue: nextActual, completionDate: existing?.completionDate ?? null });
    const nextStatus = parsed.intent === 'update_status' && parsed.status
        ? parsed.status
        : (0, checkinProgress_service_1.deriveCheckInStatus)(nextProgress);
    const checkIn = existing
        ? await prisma_1.prisma.checkIn.update({
            where: { id: existing.id },
            data: {
                actualValue: nextActual,
                status: nextStatus,
                progressScore: nextProgress,
                employeeNote: `[${platform.toUpperCase()}] ${command}`
            }
        })
        : await prisma_1.prisma.checkIn.create({
            data: {
                tenantId: goal.tenantId,
                goalId: goal.id,
                userId: goal.userId,
                quarter,
                actualValue: nextActual,
                status: nextStatus,
                progressScore: nextProgress,
                employeeNote: `[${platform.toUpperCase()}] ${command}`
            }
        });
    await prisma_1.prisma.auditLog.create({
        data: {
            tenantId: goal.tenantId,
            goalId: goal.id,
            userId: user.id,
            action: 'CHATOPS_COMMAND_EXECUTED',
            field: parsed.intent === 'update_status' ? 'status' : parsed.intent === 'update_target' ? 'target' : 'actualValue',
            newValue: parsed.intent === 'update_status' ? String(nextStatus) : String(parsed.value ?? nextActual)
        }
    });
    await (0, domainEvent_service_1.emitDomainEvent)({
        tenantId: user.tenantId,
        eventName: 'checkin.updated',
        aggregateType: 'goal',
        aggregateId: goal.id,
        payload: {
            source: 'chatops',
            platform,
            actorUserId: user.id,
            checkInId: checkIn.id,
            progressScore: nextProgress,
            status: nextStatus
        }
    });
    res.json({
        platform,
        parsed,
        goal,
        checkIn,
        message: parsed.intent === 'update_status'
            ? `${platform === 'slack' ? 'Slack' : 'Teams'} bot updated "${goal.title}" to ${nextStatus}. Progress is now ${Math.min(nextProgress, 999)}%.`
            : `${platform === 'slack' ? 'Slack' : 'Teams'} bot updated "${goal.title}". Progress is now ${Math.min(nextProgress, 999)}%.`
    });
});
exports.listWebhookEndpoints = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.ADMIN) {
        throw (0, errors_1.forbidden)('Only admins can manage webhook endpoints');
    }
    const endpoints = await prisma_1.prisma.webhookEndpoint.findMany({
        where: { tenantId: user.tenantId },
        include: {
            deliveries: {
                orderBy: { createdAt: 'desc' },
                take: 5
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    res.json({ endpoints });
});
exports.createWebhookEndpoint = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.ADMIN) {
        throw (0, errors_1.forbidden)('Only admins can create webhook endpoints');
    }
    const { name, url, secret, subscribedEvents = [] } = req.body;
    if (!name || !url || !secret) {
        throw (0, errors_1.badRequest)('name, url, and secret are required');
    }
    const endpoint = await prisma_1.prisma.webhookEndpoint.create({
        data: {
            tenantId: user.tenantId,
            name,
            url,
            secret,
            subscribedEvents,
            createdByUserId: user.id,
            isActive: req.body.isActive ?? true
        }
    });
    res.status(201).json({ endpoint });
});
exports.testWebhookEndpoint = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.ADMIN) {
        throw (0, errors_1.forbidden)('Only admins can test webhook endpoints');
    }
    const endpoint = await prisma_1.prisma.webhookEndpoint.findFirst({ where: { id: req.params.id, tenantId: user.tenantId } });
    if (!endpoint) {
        throw (0, errors_1.badRequest)('Webhook endpoint not found');
    }
    await (0, domainEvent_service_1.emitDomainEvent)({
        tenantId: user.tenantId,
        eventName: 'webhook.test',
        aggregateType: 'webhook-endpoint',
        aggregateId: endpoint.id,
        payload: {
            endpointId: endpoint.id,
            name: endpoint.name,
            requestedBy: user.id
        }
    });
    res.json({ ok: true });
});
exports.getWebhookDeliveries = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.ADMIN) {
        throw (0, errors_1.forbidden)('Only admins can view webhook deliveries');
    }
    const deliveries = await prisma_1.prisma.webhookDelivery.findMany({
        where: { tenantId: user.tenantId },
        include: {
            endpoint: { select: { id: true, name: true, url: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
    });
    res.json({ deliveries });
});
exports.getFeatureFlags = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.ADMIN) {
        throw (0, errors_1.forbidden)('Only admins can view feature flags');
    }
    const flags = await (0, featureFlag_service_1.listFeatureFlags)(user.tenantId);
    res.json({ flags });
});
exports.updateFeatureFlag = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.ADMIN) {
        throw (0, errors_1.forbidden)('Only admins can update feature flags');
    }
    const enabled = typeof req.body.enabled === 'boolean' ? req.body.enabled : null;
    if (enabled == null) {
        throw (0, errors_1.badRequest)('enabled must be provided as a boolean');
    }
    const flag = await (0, featureFlag_service_1.setFeatureFlag)(user.tenantId, req.params.key, enabled, req.body.description, req.body.metadata);
    res.json({ flag });
});
exports.getPlatformOverview = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.ADMIN) {
        throw (0, errors_1.forbidden)('Only admins can view platform monitoring');
    }
    const [tenant, endpoints, deliveries, flags, events] = await Promise.all([
        prisma_1.prisma.tenant.findUnique({ where: { id: user.tenantId } }),
        prisma_1.prisma.webhookEndpoint.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' } }),
        prisma_1.prisma.webhookDelivery.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 25 }),
        (0, featureFlag_service_1.listFeatureFlags)(user.tenantId),
        prisma_1.prisma.domainEvent.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 25 })
    ]);
    res.json({
        tenant,
        summary: {
            activeWebhookEndpoints: endpoints.filter((endpoint) => endpoint.isActive).length,
            recentDeliveryFailures: deliveries.filter((delivery) => delivery.status === 'FAILED').length,
            enabledFlags: flags.filter((flag) => flag.enabled).length,
            recordedEvents: events.length
        },
        endpoints,
        deliveries,
        flags,
        events
    });
});
exports.listDomainEvents = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.ADMIN) {
        throw (0, errors_1.forbidden)('Only admins can view domain events');
    }
    const take = Math.min(100, Number(req.query.take ?? 50));
    const events = await prisma_1.prisma.domainEvent.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: 'desc' },
        take
    });
    res.json({ events });
});
