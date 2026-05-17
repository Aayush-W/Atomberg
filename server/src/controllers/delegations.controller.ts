import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, forbidden } from '../utils/errors';
import { currentUser } from './_helpers';
import { CreateDelegationInput } from '../validators/delegation.validators';

export const listDelegations = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const where =
    user.role === Role.ADMIN
      ? {}
      : {
          OR: [{ delegatorManagerId: user.id }, { delegateManagerId: user.id }]
        };

  const delegations = await prisma.approvalDelegation.findMany({
    where,
    include: {
      delegatorManager: { select: { id: true, name: true, department: true } },
      delegateManager: { select: { id: true, name: true, department: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ delegations });
});

export const createDelegation = asyncHandler(async (req: Request<unknown, unknown, CreateDelegationInput>, res: Response) => {
  const user = currentUser(req);
  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
    throw forbidden('Only managers and admins can create delegations');
  }

  const delegatorManagerId = user.role === Role.ADMIN ? req.body.delegatorManagerId ?? user.id : user.id;
  if (delegatorManagerId === req.body.delegateManagerId) {
    throw badRequest('Delegator and delegate must be different users');
  }
  if (req.body.endsAt <= req.body.startsAt) {
    throw badRequest('Delegation end date must be after the start date');
  }

  const delegator = await prisma.user.findUnique({ where: { id: delegatorManagerId } });
  const delegate = await prisma.user.findUnique({ where: { id: req.body.delegateManagerId } });
  if (!delegator || delegator.role !== Role.MANAGER) {
    throw badRequest('Delegator must be a manager');
  }
  if (!delegate || delegate.role !== Role.MANAGER) {
    throw badRequest('Delegate must be a manager');
  }

  const delegation = await prisma.approvalDelegation.create({
    data: {
      delegatorManagerId,
      delegateManagerId: req.body.delegateManagerId,
      startsAt: req.body.startsAt,
      endsAt: req.body.endsAt,
      reason: req.body.reason
    },
    include: {
      delegatorManager: { select: { id: true, name: true, department: true } },
      delegateManager: { select: { id: true, name: true, department: true } }
    }
  });

  res.status(201).json({ delegation });
});
