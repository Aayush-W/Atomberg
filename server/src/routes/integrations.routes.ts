import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getTeamsCards, handleTeamsAction } from '../controllers/integrations.controller';

export const integrationsRouter = Router();

integrationsRouter.use(requireAuth);
integrationsRouter.get('/teams/cards/:managerId', getTeamsCards);
integrationsRouter.post('/teams/actions/:decision', handleTeamsAction);
