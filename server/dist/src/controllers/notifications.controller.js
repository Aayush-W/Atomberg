"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllRead = exports.markRead = exports.getNotifications = void 0;
exports.createNotification = createNotification;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const getNotifications = async (req, res, next) => {
    try {
        const notifications = await prisma_1.prisma.notification.findMany({
            where: { tenantId: req.user.tenantId, userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        res.json({ notifications });
    }
    catch (err) {
        next(err);
    }
};
exports.getNotifications = getNotifications;
const markRead = async (req, res, next) => {
    try {
        const n = await prisma_1.prisma.notification.updateMany({
            where: { id: req.params.id, tenantId: req.user.tenantId, userId: req.user.id },
            data: { isRead: true },
        });
        if (n.count === 0) {
            res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found' } });
            return;
        }
        res.json(n);
    }
    catch (err) {
        next(err);
    }
};
exports.markRead = markRead;
const markAllRead = async (req, res, next) => {
    try {
        await prisma_1.prisma.notification.updateMany({
            where: { tenantId: req.user.tenantId, userId: req.user.id, isRead: false },
            data: { isRead: true },
        });
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
};
exports.markAllRead = markAllRead;
// Helper: create a notification
async function createNotification(userId, type, title, message, channel = client_1.NotificationChannel.IN_APP, metadata, tenantId) {
    const resolvedTenantId = tenantId ??
        (await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { tenantId: true }
        }))?.tenantId;
    if (!resolvedTenantId) {
        throw new Error('Unable to resolve tenant for notification');
    }
    return prisma_1.prisma.notification.create({
        data: {
            tenantId: resolvedTenantId,
            userId,
            type,
            title,
            message,
            channel,
            metadata: metadata
        }
    });
}
