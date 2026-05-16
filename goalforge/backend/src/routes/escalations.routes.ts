import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { getRules, createRule, updateRule, getLog, triggerManual } from '../controllers/escalations.controller';

export const escalationsRouter = Router();
escalationsRouter.use(requireAuth);
escalationsRouter.get('/rules', requireRole('ADMIN'), getRules);
escalationsRouter.post('/rules', requireRole('ADMIN'), createRule);
escalationsRouter.put('/rules/:id', requireRole('ADMIN'), updateRule);
escalationsRouter.get('/log', requireRole('ADMIN'), getLog);
escalationsRouter.post('/trigger-manual', requireRole('ADMIN'), triggerManual);
