"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDelegation = exports.listDelegations = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const _helpers_1 = require("./_helpers");
exports.listDelegations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    const where = user.role === client_1.Role.ADMIN
        ? { tenantId: user.tenantId }
        : {
            tenantId: user.tenantId,
            OR: [{ delegatorManagerId: user.id }, { delegateManagerId: user.id }]
        };
    const delegations = await prisma_1.prisma.approvalDelegation.findMany({
        where,
        include: {
            delegatorManager: { select: { id: true, name: true, department: true } },
            delegateManager: { select: { id: true, name: true, department: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    res.json({ delegations });
});
exports.createDelegation = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.role !== client_1.Role.MANAGER && user.role !== client_1.Role.ADMIN) {
        throw (0, errors_1.forbidden)('Only managers and admins can create delegations');
    }
    const delegatorManagerId = user.role === client_1.Role.ADMIN ? req.body.delegatorManagerId ?? user.id : user.id;
    if (delegatorManagerId === req.body.delegateManagerId) {
        throw (0, errors_1.badRequest)('Delegator and delegate must be different users');
    }
    if (req.body.endsAt <= req.body.startsAt) {
        throw (0, errors_1.badRequest)('Delegation end date must be after the start date');
    }
    const delegator = await prisma_1.prisma.user.findFirst({ where: { tenantId: user.tenantId, id: delegatorManagerId } });
    const delegate = await prisma_1.prisma.user.findFirst({ where: { tenantId: user.tenantId, id: req.body.delegateManagerId } });
    if (!delegator || delegator.role !== client_1.Role.MANAGER) {
        throw (0, errors_1.badRequest)('Delegator must be a manager');
    }
    if (!delegate || delegate.role !== client_1.Role.MANAGER) {
        throw (0, errors_1.badRequest)('Delegate must be a manager');
    }
    const delegation = await prisma_1.prisma.approvalDelegation.create({
        data: {
            tenantId: user.tenantId,
            delegatorManagerId,
            delegateManagerId: req.body.delegateManagerId,
            startsAt: req.body.startsAt,
            endsAt: req.body.endsAt,
            reason: req.body.reason
        },
        include: {
            delegatorManager: { select: { id: true, name: true, department: true } },
            delegateManager: { select: { id: true, name: true, department: true } }
        }
    });
    res.status(201).json({ delegation });
});
