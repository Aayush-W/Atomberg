import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { predictAchievement, goalQuality, getAnomalies, suggestThrustArea, sentimentTrends } from '../controllers/ml.controller';

export const mlRouter = Router();
mlRouter.use(requireAuth);
mlRouter.post('/predict-achievement', predictAchievement);
mlRouter.post('/goal-quality', goalQuality);
mlRouter.get('/anomalies', getAnomalies);
mlRouter.post('/suggest-thrust-area', suggestThrustArea);
mlRouter.get('/sentiment-trends', sentimentTrends);
