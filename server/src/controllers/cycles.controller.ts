import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { CreateCycleInput, UpdateCycleInput } from '../validators/cycle.validators';

const quarterWindowDays = 21;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isWindowOpen(openDate: Date, closeDate: Date, bypassWindow: boolean, now = new Date()): boolean {
  return bypassWindow || (now >= openDate && now <= closeDate);
}

function cycleStatus(cycle: {
  goalSettingOpen: Date;
  q1Open: Date;
  q2Open: Date;
  q3Open: Date;
  q4Open: Date;
  endDate: Date;
  bypassWindow: boolean;
}) {
  return {
    bypassWindow: cycle.bypassWindow,
    goalSetting: {
      opensAt: cycle.goalSettingOpen,
      closesAt: cycle.q1Open,
      isOpen: isWindowOpen(cycle.goalSettingOpen, cycle.q1Open, cycle.bypassWindow)
    },
    checkIns: {
      Q1: {
        opensAt: cycle.q1Open,
        closesAt: addDays(cycle.q1Open, quarterWindowDays),
        isOpen: isWindowOpen(cycle.q1Open, addDays(cycle.q1Open, quarterWindowDays), cycle.bypassWindow)
      },
      Q2: {
        opensAt: cycle.q2Open,
        closesAt: addDays(cycle.q2Open, quarterWindowDays),
        isOpen: isWindowOpen(cycle.q2Open, addDays(cycle.q2Open, quarterWindowDays), cycle.bypassWindow)
      },
      Q3: {
        opensAt: cycle.q3Open,
        closesAt: addDays(cycle.q3Open, quarterWindowDays),
        isOpen: isWindowOpen(cycle.q3Open, addDays(cycle.q3Open, quarterWindowDays), cycle.bypassWindow)
      },
      Q4: {
        opensAt: cycle.q4Open,
        closesAt: cycle.endDate,
        isOpen: isWindowOpen(cycle.q4Open, cycle.endDate, cycle.bypassWindow)
      }
    }
  };
}

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
