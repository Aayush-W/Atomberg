import { NotificationChannel } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { tenantId: req.user!.tenantId, userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ notifications });
  } catch (err) { next(err); }
};

export const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const n = await prisma.notification.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId, userId: req.user!.id },
      data: { isRead: true },
    });
    if (n.count === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found' } });
      return;
    }
    res.json(n);
  } catch (err) { next(err); }
};

export const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { tenantId: req.user!.tenantId, userId: req.user!.id, isRead: false },
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
  metadata?: unknown,
  tenantId?: string
) {
  const resolvedTenantId =
    tenantId ??
    (
      await prisma.user.findUnique({
        where: { id: userId },
        select: { tenantId: true }
      })
    )?.tenantId;

  if (!resolvedTenantId) {
    throw new Error('Unable to resolve tenant for notification');
  }

  return prisma.notification.create({
    data: {
      tenantId: resolvedTenantId,
      userId,
      type,
      title,
      message,
      channel,
      metadata: metadata as any
    }
  });
}
