import { Request, Response, NextFunction } from 'express';
import * as aiSvc from '../services/ai.service';
import { prisma } from '../lib/prisma';

const AI_UNAVAILABLE = { error: { code: 'AI_UNAVAILABLE', message: 'AI service temporarily unavailable. Please try again later.' } };

export const smartRewrite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { thrustArea, title, description } = req.body;
    if (!title || !description) return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'title and description required' } });
    const result = await aiSvc.smartRewrite(thrustArea || '', title, description);
    res.json(result);
  } catch (err: any) {
    if (err?.status === 529 || err?.message?.includes('timeout')) return res.status(503).json(AI_UNAVAILABLE);
    next(err);
  }
};

export const conflictCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { goals } = req.body;
    if (!Array.isArray(goals) || goals.length === 0) return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'goals array required' } });
    const result = await aiSvc.conflictCheck(goals);
    res.json(result);
  } catch (err: any) {
    if (err?.status === 529 || err?.message?.includes('timeout')) return res.status(503).json(AI_UNAVAILABLE);
    next(err);
  }
};

export const suggestWeightage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { goals, thrustAreas } = req.body;
    const result = await aiSvc.suggestWeightage(goals, thrustAreas);
    res.json(result);
  } catch (err: any) {
    if (err?.status === 529) return res.status(503).json(AI_UNAVAILABLE);
    next(err);
  }
};

export const conversationalCheckin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { goalId, quarter, messages = [] } = req.body;
    const result = await aiSvc.conversationalCheckin(goalId, quarter, messages);
    res.json(result);
  } catch (err: any) {
    if (err?.status === 529) return res.status(503).json(AI_UNAVAILABLE);
    next(err);
  }
};

export const goalSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.body;
    const goals = await prisma.goal.findMany({
      where: { userId: employeeId },
      include: { checkIns: true },
    });
    const result = await aiSvc.goalSummary({ goals });
    res.json(result);
  } catch (err: any) {
    if (err?.status === 529) return res.status(503).json(AI_UNAVAILABLE);
    next(err);
  }
};
