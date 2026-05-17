import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getTeamsCards,
  handleTeamsAction,
  receiveExternalWebhook,
  simulateExternalSync,
  handleChatOpsCommand,
  listWebhookEndpoints,
  createWebhookEndpoint,
  testWebhookEndpoint,
  getWebhookDeliveries,
  getFeatureFlags,
  updateFeatureFlag,
  getPlatformOverview,
  listDomainEvents
} from '../controllers/integrations.controller';

export const integrationsRouter = Router();

integrationsRouter.post('/webhooks/:provider', receiveExternalWebhook);

integrationsRouter.use(requireAuth);
integrationsRouter.get('/teams/cards/:managerId', getTeamsCards);
integrationsRouter.post('/teams/actions/:decision', handleTeamsAction);
integrationsRouter.post('/sync/:provider', simulateExternalSync);
integrationsRouter.post('/chatops/command', handleChatOpsCommand);
integrationsRouter.get('/webhooks', listWebhookEndpoints);
integrationsRouter.post('/webhooks', createWebhookEndpoint);
integrationsRouter.post('/webhooks/:id/test', testWebhookEndpoint);
integrationsRouter.get('/webhook-deliveries', getWebhookDeliveries);
integrationsRouter.get('/feature-flags', getFeatureFlags);
integrationsRouter.put('/feature-flags/:key', updateFeatureFlag);
integrationsRouter.get('/platform', getPlatformOverview);
integrationsRouter.get('/events', listDomainEvents);
