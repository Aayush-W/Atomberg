import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, forbidden } from '../utils/errors';
import { currentUser } from './_helpers';
import { createNotification } from './notifications.controller';
import { CreateKudosInput } from '../validators/kudos.validators';

export const listKudos = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const receiverId = typeof req.query.receiverId === 'string' ? req.query.receiverId : undefined;
  const where =
    user.role === Role.ADMIN
      ? receiverId
        ? { receiverId }
        : {}
      : {
          OR: [{ receiverId: receiverId ?? user.id }, { senderId: user.id }]
        };

  const kudos = await prisma.kudos.findMany({
    where,
    include: {
      sender: { select: { id: true, name: true, department: true } },
      receiver: { select: { id: true, name: true, department: true } },
      goal: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  res.json({ kudos });
});

export const createKudos = asyncHandler(async (req: Request<unknown, unknown, CreateKudosInput>, res: Response) => {
  const user = currentUser(req);
  if (user.id === req.body.receiverId) {
    throw badRequest('You cannot award kudos to yourself');
  }

  const receiver = await prisma.user.findUnique({ where: { id: req.body.receiverId } });
  if (!receiver) {
    throw badRequest('Receiver not found');
  }

  if (req.body.goalId) {
    const goal = await prisma.goal.findUnique({ where: { id: req.body.goalId } });
    if (!goal) {
      throw badRequest('Linked goal not found');
    }
    if (goal.userId !== req.body.receiverId) {
      throw forbidden('Linked goal must belong to the kudos recipient');
    }
  }

  const kudos = await prisma.kudos.create({
    data: {
      senderId: user.id,
      receiverId: req.body.receiverId,
      goalId: req.body.goalId,
      badgeType: req.body.badgeType,
      note: req.body.note
    },
    include: {
      sender: { select: { id: true, name: true, department: true } },
      receiver: { select: { id: true, name: true, department: true } },
      goal: { select: { id: true, title: true } }
    }
  });

  await createNotification(
    receiver.id,
    'KUDOS_RECEIVED',
    `New ${req.body.badgeType.toLowerCase().replace(/_/g, ' ')} kudos`,
    `${user.name} recognized you for "${req.body.note}"`,
    undefined,
    { kudosId: kudos.id, goalId: req.body.goalId ?? null }
  );

  res.status(201).json({ kudos });
});
