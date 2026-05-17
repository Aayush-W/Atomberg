import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { Role } from '@prisma/client';
import { buildTeamSentimentSummary } from '../services/sentiment.service';
import { buildFlightRiskReport } from '../services/risk.service';
import { runWhatIfSimulation } from '../services/decisionIntelligence.service';
import { emitDomainEvent } from '../services/domainEvent.service';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
const ML_UNAVAILABLE = { error: { code: 'ML_UNAVAILABLE', message: 'AI insights temporarily unavailable.' } };

async function callML(path: string, data?: object) {
  return axios.post(`${ML_URL}${path}`, data, { timeout: 10000 });
}

export const predictAchievement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await callML('/predict-achievement', req.body);
    res.json(data);
  } catch { res.status(503).json(ML_UNAVAILABLE); }
};

export const goalQuality = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await callML('/goal-quality', req.body);
    res.json(data);
  } catch { res.status(503).json(ML_UNAVAILABLE); }
};

export const getAnomalies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await axios.get(`${ML_URL}/anomalies`, { params: req.query, timeout: 10000 });
    res.json(data);
  } catch { res.status(503).json(ML_UNAVAILABLE); }
};

export const suggestThrustArea = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await callML('/suggest-thrust-area', req.body);
    res.json(data);
  } catch { res.status(503).json(ML_UNAVAILABLE); }
};

export const sentimentTrends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const managerId =
      req.user?.role === Role.MANAGER && !req.query.managerId ? req.user.id : (req.query.managerId as string | undefined);
    const summary = await buildTeamSentimentSummary(req.user!.tenantId, managerId);
    res.json({ trends: summary.trends });
  } catch { res.status(503).json(ML_UNAVAILABLE); }
};

export const teamSentiment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const managerId =
      req.user?.role === Role.MANAGER && !req.query.managerId ? req.user.id : (req.query.managerId as string | undefined);
    const summary = await buildTeamSentimentSummary(req.user!.tenantId, managerId);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

export const flightRisk = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const managerId =
      req.user?.role === Role.MANAGER && !req.query.managerId ? req.user.id : (req.query.managerId as string | undefined);
    const report = await buildFlightRiskReport(req.user!.tenantId, managerId);
    await Promise.all(
      report.employees
        .filter((item) => item.riskLevel === 'HIGH')
        .slice(0, 3)
        .map((item) =>
          emitDomainEvent({
            tenantId: req.user!.tenantId,
            eventName: 'risk.detected',
            aggregateType: 'user',
            aggregateId: item.userId,
            payload: {
              userId: item.userId,
              userName: item.userName,
              riskScore: item.riskScore,
              reasons: item.reasons,
              confidence: item.confidence
            }
          })
        )
    );
    res.json(report);
  } catch (error) {
    next(error);
  }
};

export const whatIfSimulation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const goalId = typeof req.body.goalId === 'string' ? req.body.goalId : null;
    const newWeightage = typeof req.body.newWeightage === 'number' ? req.body.newWeightage : null;
    if (!goalId || newWeightage == null) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'goalId and newWeightage are required' } });
    }

    const result = await runWhatIfSimulation({
      tenantId: user.tenantId,
      requesterRole: user.role,
      requesterId: user.id,
      goalId,
      newWeightage
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};
