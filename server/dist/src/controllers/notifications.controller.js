"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllRead = exports.markRead = exports.getNotifications = void 0;
exports.createNotification = createNotification;
const prisma_1 = require("../lib/prisma");
const getNotifications = async (req, res, next) => {
    try {
        const notifications = await prisma_1.prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        res.json(notifications);
    }
    catch (err) {
        next(err);
    }
};
exports.getNotifications = getNotifications;
const markRead = async (req, res, next) => {
    try {
        const n = await prisma_1.prisma.notification.update({
            where: { id: req.params.id },
            data: { isRead: true },
        });
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
            where: { userId: req.user.id, isRead: false },
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
async function createNotification(userId, type, title, message) {
    return prisma_1.prisma.notification.create({ data: { userId, type, title, message } });
}
