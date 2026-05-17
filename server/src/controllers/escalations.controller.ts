import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { runEscalationCheck } from '../jobs/escalation.job';

const RuleSchema = z.object({
  name: z.string().min(1),
  triggerType: z.enum(['GOAL_NOT_SUBMITTED', 'APPROVAL_PENDING', 'CHECKIN_MISSING']),
  daysThreshold: z.number().int().positive(),
  isActive: z.boolean().default(true),
  escalationChain: z.array(z.object({ level: z.number(), notifyRole: z.string() })).default([
    { level: 1, notifyRole: 'MANAGER' },
    { level: 2, notifyRole: 'ADMIN' },
  ]),
});

export const getRules = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await prisma.escalationRule.findMany({ orderBy: { id: 'asc' } }));
  } catch (err) { next(err); }
};

export const createRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = RuleSchema.parse(req.body);
    res.status(201).json(await prisma.escalationRule.create({ data }));
  } catch (err) { next(err); }
};

export const updateRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = RuleSchema.partial().parse(req.body);
    res.json(await prisma.escalationRule.update({ where: { id: req.params.id }, data }));
  } catch (err) { next(err); }
};

export const getLog = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.escalationEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        recipientUser: { select: { name: true, email: true } },
        rule: { select: { name: true, triggerType: true } }
      }
    });
    res.json(logs);
  } catch (err) { next(err); }
};

export const triggerManual = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await runEscalationCheck();
    res.json({ ok: true, message: 'Escalation check triggered' });
  } catch (err) { next(err); }
};
