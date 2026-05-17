import { Role } from '@prisma/client';
import { Router } from 'express';
import * as reportsController from '../controllers/reports.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

export const reportsRouter = Router();

reportsRouter.use(requireAuth);
reportsRouter.get('/achievement/export', requireRole(Role.MANAGER, Role.ADMIN), reportsController.exportAchievementReport);
reportsRouter.get('/achievement', requireRole(Role.MANAGER, Role.ADMIN), reportsController.getAchievementReport);
reportsRouter.get('/completion', requireRole(Role.MANAGER, Role.ADMIN), reportsController.getCompletionReport);
reportsRouter.get('/manager-effectiveness', requireRole(Role.MANAGER, Role.ADMIN), reportsController.getManagerEffectivenessReport);
reportsRouter.get('/qoq-trends', requireRole(Role.MANAGER, Role.ADMIN), reportsController.getQoQTrendsReport);
reportsRouter.get('/leaderboards', requireRole(Role.MANAGER, Role.ADMIN), reportsController.getLeaderboards);
reportsRouter.get('/dossier/:userId', reportsController.getPerformanceDossier);
