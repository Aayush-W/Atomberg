"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createKudos = exports.listKudos = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const _helpers_1 = require("./_helpers");
const notifications_controller_1 = require("./notifications.controller");
exports.listKudos = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    const receiverId = typeof req.query.receiverId === 'string' ? req.query.receiverId : undefined;
    const where = user.role === client_1.Role.ADMIN
        ? receiverId
            ? { receiverId }
            : {}
        : {
            OR: [{ receiverId: receiverId ?? user.id }, { senderId: user.id }]
        };
    const kudos = await prisma_1.prisma.kudos.findMany({
        where,
        include: {
            sender: { select: { id: true, name: true, department: true } },
            receiver: { select: { id: true, name: true, department: true } },
            goal: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
    });
    res.json({ kudos });
});
exports.createKudos = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = (0, _helpers_1.currentUser)(req);
    if (user.id === req.body.receiverId) {
        throw (0, errors_1.badRequest)('You cannot award kudos to yourself');
    }
    const receiver = await prisma_1.prisma.user.findUnique({ where: { id: req.body.receiverId } });
    if (!receiver) {
        throw (0, errors_1.badRequest)('Receiver not found');
    }
    if (req.body.goalId) {
        const goal = await prisma_1.prisma.goal.findUnique({ where: { id: req.body.goalId } });
        if (!goal) {
            throw (0, errors_1.badRequest)('Linked goal not found');
        }
        if (goal.userId !== req.body.receiverId) {
            throw (0, errors_1.forbidden)('Linked goal must belong to the kudos recipient');
        }
    }
    const kudos = await prisma_1.prisma.kudos.create({
        data: {
            senderId: user.id,
            receiverId: req.body.receiverId,
            goalId: req.body.goalId,
            badgeType: req.body.badgeType,
            note: req.body.note
        },
        include: {
            sender: { select: { id: true, name: true, department: true } },
            receiver: { select: { id: true, name: true, department: true } },
            goal: { select: { id: true, title: true } }
        }
    });
    await (0, notifications_controller_1.createNotification)(receiver.id, 'KUDOS_RECEIVED', `New ${req.body.badgeType.toLowerCase().replace(/_/g, ' ')} kudos`, `${user.name} recognized you for "${req.body.note}"`, undefined, { kudosId: kudos.id, goalId: req.body.goalId ?? null });
    res.status(201).json({ kudos });
});
