import { Role } from '@prisma/client';
import { Router } from 'express';
import * as usersController from '../controllers/users.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createUserSchema,
  idParamSchema,
  managerIdParamSchema,
  updateUserSchema
} from '../validators/user.validators';

export const usersRouter = Router();

usersRouter.use(requireAuth);
usersRouter.get('/', requireRole(Role.ADMIN), usersController.listUsers);
usersRouter.get('/managers', requireRole(Role.MANAGER, Role.ADMIN), usersController.listManagers);
usersRouter.post('/', requireRole(Role.ADMIN), validate(createUserSchema), usersController.createUser);
usersRouter.get('/team/:managerId', validate(managerIdParamSchema, 'params'), usersController.getTeam);
usersRouter.get('/:id', validate(idParamSchema, 'params'), usersController.getUser);
usersRouter.put('/:id', validate(idParamSchema, 'params'), validate(updateUserSchema), usersController.updateUser);
