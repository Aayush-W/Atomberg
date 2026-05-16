import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const getAuditLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, goalId, from, to, limit = '100' } = req.query as Record<string, string>;
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(userId && { userId }),
        ...(goalId && { goalId }),
        ...(from || to ? {
          timestamp: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        } : {}),
      },
      include: { user: { select: { id: true, name: true, email: true, role: true } }, goal: { select: { id: true, title: true } } },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
    });
    res.json(logs);
  } catch (err) { next(err); }
};

export const getAuditForGoal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { goalId: req.params.goalId },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { timestamp: 'desc' },
    });
    res.json(logs);
  } catch (err) { next(err); }
};
