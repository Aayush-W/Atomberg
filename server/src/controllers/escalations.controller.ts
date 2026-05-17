import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { runEscalationCheck } from '../jobs/escalation.job';
import { currentUser } from './_helpers';

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
    const user = currentUser(_req);
    res.json(await prisma.escalationRule.findMany({ where: { tenantId: user.tenantId }, orderBy: { id: 'asc' } }));
  } catch (err) { next(err); }
};

export const createRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = currentUser(req);
    const data = RuleSchema.parse(req.body);
    res.status(201).json(await prisma.escalationRule.create({ data: { ...data, tenantId: user.tenantId } }));
  } catch (err) { next(err); }
};

export const updateRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = currentUser(req);
    const data = RuleSchema.partial().parse(req.body);
    const updated = await prisma.escalationRule.updateMany({ where: { id: req.params.id, tenantId: user.tenantId }, data });
    if (updated.count === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Escalation rule not found' } });
      return;
    }
    res.json(await prisma.escalationRule.findFirst({ where: { id: req.params.id, tenantId: user.tenantId } }));
  } catch (err) { next(err); }
};

export const getLog = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const user = currentUser(_req);
    const logs = await prisma.escalationEvent.findMany({
      where: { tenantId: user.tenantId },
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
    await runEscalationCheck(currentUser(_req).tenantId);
    res.json({ ok: true, message: 'Escalation check triggered' });
  } catch (err) { next(err); }
};
