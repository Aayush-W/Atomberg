import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import * as aiSvc from '../services/ai.service';
import { prisma } from '../lib/prisma';
import { currentUser } from './_helpers';
import { forbidden } from '../utils/errors';
import { buildCalibrationCopilot, buildNarrativeInputs } from '../services/decisionIntelligence.service';
import { emitDomainEvent } from '../services/domainEvent.service';

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
    const user = currentUser(req);
    const goals = await prisma.goal.findMany({
      where: { tenantId: user.tenantId, userId: employeeId },
      include: { checkIns: true },
    });
    const result = await aiSvc.goalSummary({ goals });
    res.json(result);
  } catch (err: any) {
    if (err?.status === 529) return res.status(503).json(AI_UNAVAILABLE);
    next(err);
  }
};

export const goalAutopilot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobTitle = req.body.jobTitle || req.user?.jobTitle;
    if (!jobTitle) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'jobTitle is required' } });
    }

    const result = await aiSvc.goalAutopilot(jobTitle, req.body.department || req.user?.department);
    res.json(result);
  } catch (err: any) {
    if (err?.status === 529 || err?.message?.includes('timeout')) return res.status(503).json(AI_UNAVAILABLE);
    next(err);
  }
};

export const performanceReviewDraft = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = currentUser(req);
    const employeeId = typeof req.body.employeeId === 'string' ? req.body.employeeId : null;
    if (!employeeId) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'employeeId is required' } });
    }

    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      include: {
        tenant: true,
        manager: { select: { id: true, name: true } },
        goals: {
          include: {
            checkIns: { orderBy: { createdAt: 'asc' } }
          },
          orderBy: { createdAt: 'asc' }
        },
        kudosReceived: {
          include: {
            sender: { select: { name: true, department: true } },
            goal: { select: { title: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        checkIns: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    }
    if (employee.tenantId !== user.tenantId) {
      throw forbidden('Employee is outside your tenant');
    }

    if (user.role === Role.MANAGER && employee.managerId !== user.id) {
      throw forbidden('Managers can only draft reviews for their direct reportees');
    }

    const sentiments = employee.checkIns.map((entry) => entry.sentiment).filter((value): value is number => typeof value === 'number');
    const goalsCompleted = employee.goals.filter((goal) => goal.status === 'LOCKED' || goal.status === 'APPROVED').length;
    const averageProgress = employee.goals.length
      ? employee.goals.reduce((sum, goal) => sum + (goal.checkIns.at(-1)?.progressScore ?? 0), 0) / employee.goals.length
      : 0;

    const result = await aiSvc.draftPerformanceReview({
      employeeName: employee.name,
      managerName: employee.manager?.name,
      cycleName: employee.goals[0]?.cycleId ?? null,
      summaryMetrics: {
        goalsCompleted,
        averageProgress: Number(averageProgress.toFixed(1)),
        kudosCount: employee.kudosReceived.length,
        averageSentiment: sentiments.length
          ? Number((sentiments.reduce((sum, value) => sum + value, 0) / sentiments.length).toFixed(3))
          : 0
      },
      goals: employee.goals.map((goal) => ({
        title: goal.title,
        thrustArea: goal.thrustArea,
        target: goal.target,
        status: goal.status,
        progressScore: goal.checkIns.at(-1)?.progressScore ?? 0,
        managerComment: goal.managerComment
      })),
      checkIns: employee.checkIns.map((entry) => ({
        quarter: entry.quarter,
        actualValue: entry.actualValue,
        status: entry.status,
        progressScore: entry.progressScore,
        sentiment: entry.sentiment,
        employeeNote: entry.employeeNote,
        managerComment: entry.managerComment
      })),
      kudos: employee.kudosReceived.map((entry) => ({
        badgeType: entry.badgeType,
        note: entry.note,
        senderName: entry.sender.name,
        goalTitle: entry.goal?.title ?? null
      }))
    });

    await emitDomainEvent({
      tenantId: user.tenantId,
      eventName: 'review.generated',
      aggregateType: 'user',
      aggregateId: employee.id,
      payload: {
        employeeId: employee.id,
        employeeName: employee.name,
        managerId: employee.managerId,
        highlights: result.highlights
      }
    });

    res.json({
      employee: {
        id: employee.id,
        name: employee.name,
        managerName: employee.manager?.name ?? null
      },
      ...result
    });
  } catch (err: any) {
    if (err?.status === 529 || err?.message?.includes('timeout')) return res.status(503).json(AI_UNAVAILABLE);
    next(err);
  }
};

export const calibrationCopilot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = currentUser(req);
    const managerId =
      user.role === Role.MANAGER && !req.query.managerId ? user.id : (req.query.managerId as string | undefined);
    const result = await buildCalibrationCopilot(user.tenantId, managerId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const narrativeIntelligence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = currentUser(req);
    const managerId =
      user.role === Role.MANAGER && !req.query.managerId ? user.id : (req.query.managerId as string | undefined);
    const inputs = await buildNarrativeInputs(user.tenantId, managerId);
    const result = await aiSvc.narrativeIntelligence(inputs);
    res.json({ ...inputs, ...result });
  } catch (err: any) {
    if (err?.status === 529 || err?.message?.includes('timeout')) return res.status(503).json(AI_UNAVAILABLE);
    next(err);
  }
};
