import bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { forbidden, unauthorized } from '../utils/errors';
import { toPublicUser } from '../utils/auth';
import { tenantUserScope } from '../utils/tenant';
import { CreateUserInput, UpdateUserInput } from '../validators/user.validators';

function assertAuthenticated(req: { user?: Request['user'] }) {
  if (!req.user) {
    throw unauthorized();
  }
  return req.user;
}

async function assertCanReadUser(req: Request, user: User): Promise<void> {
  const authUser = assertAuthenticated(req);
  if (authUser.role === Role.ADMIN || authUser.id === user.id || user.managerId === authUser.id) {
    return;
  }
  throw forbidden('You can only view users in your reporting scope');
}

function limitUpdateForNonAdmin(req: Request, targetUserId: string, input: UpdateUserInput): UpdateUserInput {
  const authUser = assertAuthenticated(req);
  if (authUser.role === Role.ADMIN) {
    return input;
  }
  if (authUser.id !== targetUserId) {
    throw forbidden('Only admins can update other users');
  }

  const allowedKeys: Array<keyof UpdateUserInput> = ['name', 'password', 'jobTitle'];
  const blockedKeys = Object.keys(input).filter((key) => !allowedKeys.includes(key as keyof UpdateUserInput));
  if (blockedKeys.length > 0) {
    throw forbidden('Only admins can update email, role, department, or manager');
  }
  return input;
}

function sanitizeUsers(users: Array<User & { tenant: { id: string; name: string; slug: string } }>) {
  return users.map((user) => toPublicUser(user as any));
}

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const authUser = assertAuthenticated(_req);
  const users = await prisma.user.findMany({
    where: tenantUserScope(authUser),
    include: { tenant: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }]
  });
  res.json({ users: sanitizeUsers(users) });
});

export const getUser = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const authUser = assertAuthenticated(req);
  const user = await prisma.user.findFirst({
    where: tenantUserScope(authUser, { id: req.params.id }),
    include: { tenant: true }
  });
  if (!user) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    return;
  }

  await assertCanReadUser(req, user);
  res.json({ user: toPublicUser(user) });
});

export const getTeam = asyncHandler(async (req: Request<{ managerId: string }>, res: Response) => {
  const authUser = assertAuthenticated(req);
  if (authUser.role !== Role.ADMIN && authUser.id !== req.params.managerId) {
    throw forbidden('Managers can only view their own team');
  }

  const users = await prisma.user.findMany({
    where: tenantUserScope(authUser, { managerId: req.params.managerId }),
    include: { tenant: true },
    orderBy: { name: 'asc' }
  });
  res.json({ users: sanitizeUsers(users) });
});

export const listManagers = asyncHandler(async (req: Request, res: Response) => {
  const authUser = assertAuthenticated(req);
  const users = await prisma.user.findMany({
    where: tenantUserScope(authUser, { role: Role.MANAGER }),
    include: { tenant: true },
    orderBy: { name: 'asc' }
  });
  res.json({ users: sanitizeUsers(users) });
});

export const createUser = asyncHandler(async (req: Request<unknown, unknown, CreateUserInput>, res: Response) => {
  const authUser = assertAuthenticated(req);
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const user = await prisma.user.create({
    data: {
      tenantId: authUser.tenantId,
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      role: req.body.role,
      department: req.body.department,
      jobTitle: req.body.jobTitle,
      managerId: req.body.managerId ?? null
    },
    include: { tenant: true }
  });

  res.status(201).json({ user: toPublicUser(user) });
});

export const updateUser = asyncHandler(
  async (req: Request<{ id: string }, unknown, UpdateUserInput>, res: Response) => {
    const authUser = assertAuthenticated(req);
    const input = limitUpdateForNonAdmin(req, req.params.id, req.body);
    const existing = await prisma.user.findFirst({
      where: tenantUserScope(authUser, { id: req.params.id })
    });
    if (!existing) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }
    const data: Partial<User> = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.email !== undefined) data.email = input.email;
    if (input.role !== undefined) data.role = input.role;
    if (input.department !== undefined) data.department = input.department;
    if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle;
    if (input.managerId !== undefined) data.managerId = input.managerId;
    if (input.password !== undefined) data.password = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      include: { tenant: true }
    });
    res.json({ user: toPublicUser(user) });
  }
);
