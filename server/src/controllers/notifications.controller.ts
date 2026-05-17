import { NotificationChannel } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ notifications });
  } catch (err) { next(err); }
};

export const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const n = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(n);
  } catch (err) { next(err); }
};

export const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// Helper: create a notification
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  channel: NotificationChannel = NotificationChannel.IN_APP,
  metadata?: unknown
) {
  return prisma.notification.create({ data: { userId, type, title, message, channel, metadata: metadata as any } });
}
