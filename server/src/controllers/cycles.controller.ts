import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { CreateCycleInput, UpdateCycleInput } from '../validators/cycle.validators';

import { cycleStatus } from '../services/cycleRules.service';

export const listCycles = asyncHandler(async (_req: Request, res: Response) => {
  const cycles = await prisma.cycle.findMany({ orderBy: { startDate: 'desc' } });
  res.json({ cycles });
});

export const getActiveCycle = asyncHandler(async (_req: Request, res: Response) => {
  const cycle = await prisma.cycle.findFirst({
    where: { isActive: true },
    orderBy: { startDate: 'desc' }
  });
  res.json({ cycle });
});

export const createCycle = asyncHandler(async (req: Request<unknown, unknown, CreateCycleInput>, res: Response) => {
  if (req.body.isActive ?? true) {
    await prisma.cycle.updateMany({ where: { isActive: true }, data: { isActive: false } });
  }

  const cycle = await prisma.cycle.create({
    data: {
      ...req.body,
      isActive: req.body.isActive ?? true,
      bypassWindow: req.body.bypassWindow ?? false
    }
  });
  res.status(201).json({ cycle });
});

export const updateCycle = asyncHandler(
  async (req: Request<{ id: string }, unknown, UpdateCycleInput>, res: Response) => {
    if (req.body.isActive === true) {
      await prisma.cycle.updateMany({
        where: { isActive: true, NOT: { id: req.params.id } },
        data: { isActive: false }
      });
    }

    const cycle = await prisma.cycle.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ cycle });
  }
);

export const getCycleStatus = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const cycle = await prisma.cycle.findUnique({ where: { id: req.params.id } });
  if (!cycle) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cycle not found' } });
    return;
  }

  res.json({ cycleId: cycle.id, status: cycleStatus(cycle) });
});
