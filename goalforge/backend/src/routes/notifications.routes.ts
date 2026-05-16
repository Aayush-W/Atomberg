import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getNotifications, markRead, markAllRead } from '../controllers/notifications.controller';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);
notificationsRouter.get('/', getNotifications);
notificationsRouter.put('/:id/read', markRead);
notificationsRouter.put('/read-all', markAllRead);
