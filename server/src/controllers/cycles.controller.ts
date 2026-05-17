import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { currentUser } from './_helpers';
import { CreateCycleInput, UpdateCycleInput } from '../validators/cycle.validators';

import { cycleStatus } from '../services/cycleRules.service';

export const listCycles = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const cycles = await prisma.cycle.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { startDate: 'desc' }
  });
  res.json({ cycles });
});

export const getActiveCycle = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const cycle = await prisma.cycle.findFirst({
    where: { tenantId: user.tenantId, isActive: true },
    orderBy: { startDate: 'desc' }
  });
  res.json({ cycle });
});

export const createCycle = asyncHandler(async (req: Request<unknown, unknown, CreateCycleInput>, res: Response) => {
  const user = currentUser(req);
  if (req.body.isActive ?? true) {
    await prisma.cycle.updateMany({ where: { tenantId: user.tenantId, isActive: true }, data: { isActive: false } });
  }

  const cycle = await prisma.cycle.create({
    data: {
      tenantId: user.tenantId,
      ...req.body,
      isActive: req.body.isActive ?? true,
      bypassWindow: req.body.bypassWindow ?? false
    }
  });
  res.status(201).json({ cycle });
});

export const updateCycle = asyncHandler(
  async (req: Request<{ id: string }, unknown, UpdateCycleInput>, res: Response) => {
    const user = currentUser(req);
    if (req.body.isActive === true) {
      await prisma.cycle.updateMany({
        where: { tenantId: user.tenantId, isActive: true, NOT: { id: req.params.id } },
        data: { isActive: false }
      });
    }

    const cycle = await prisma.cycle.updateMany({
      where: { id: req.params.id, tenantId: user.tenantId },
      data: req.body
    });
    if (cycle.count === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cycle not found' } });
      return;
    }
    const updatedCycle = await prisma.cycle.findFirst({ where: { id: req.params.id, tenantId: user.tenantId } });
    res.json({ cycle: updatedCycle });
  }
);

export const getCycleStatus = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const user = currentUser(req);
  const cycle = await prisma.cycle.findFirst({ where: { id: req.params.id, tenantId: user.tenantId } });
  if (!cycle) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cycle not found' } });
    return;
  }

  res.json({ cycleId: cycle.id, status: cycleStatus(cycle) });
});
