import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getTeamsCards,
  handleTeamsAction,
  receiveExternalWebhook,
  simulateExternalSync,
  handleChatOpsCommand
} from '../controllers/integrations.controller';

export const integrationsRouter = Router();

integrationsRouter.post('/webhooks/:provider', receiveExternalWebhook);

integrationsRouter.use(requireAuth);
integrationsRouter.get('/teams/cards/:managerId', getTeamsCards);
integrationsRouter.post('/teams/actions/:decision', handleTeamsAction);
integrationsRouter.post('/sync/:provider', simulateExternalSync);
integrationsRouter.post('/chatops/command', handleChatOpsCommand);
