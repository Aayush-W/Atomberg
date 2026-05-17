import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  smartRewrite,
  conflictCheck,
  suggestWeightage,
  conversationalCheckin,
  goalSummary,
  goalAutopilot,
  performanceReviewDraft,
  calibrationCopilot,
  narrativeIntelligence
} from '../controllers/ai.controller';

export const aiRouter = Router();
aiRouter.use(requireAuth);
aiRouter.post('/smart-rewrite', smartRewrite);
aiRouter.post('/conflict-check', conflictCheck);
aiRouter.post('/suggest-weightage', suggestWeightage);
aiRouter.post('/conversational-checkin', conversationalCheckin);
aiRouter.post('/goal-summary', goalSummary);
aiRouter.post('/goal-autopilot', goalAutopilot);
aiRouter.post('/performance-review', performanceReviewDraft);
aiRouter.get('/calibration-copilot', calibrationCopilot);
aiRouter.get('/narrative-intelligence', narrativeIntelligence);
