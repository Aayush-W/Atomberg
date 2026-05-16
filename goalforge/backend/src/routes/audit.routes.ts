import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { getAuditLog, getAuditForGoal } from '../controllers/audit.controller';

export const auditRouter = Router();
auditRouter.use(requireAuth);
auditRouter.get('/', requireRole('ADMIN'), getAuditLog);
auditRouter.get('/goal/:goalId', requireRole('ADMIN', 'MANAGER'), getAuditForGoal);
