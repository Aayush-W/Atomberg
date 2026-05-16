import { Role } from '@prisma/client';
import { Router } from 'express';
import * as cyclesController from '../controllers/cycles.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createCycleSchema, cycleIdParamSchema, updateCycleSchema } from '../validators/cycle.validators';

export const cyclesRouter = Router();

cyclesRouter.use(requireAuth);
cyclesRouter.get('/', cyclesController.listCycles);
cyclesRouter.get('/active', cyclesController.getActiveCycle);
cyclesRouter.post('/', requireRole(Role.ADMIN), validate(createCycleSchema), cyclesController.createCycle);
cyclesRouter.put('/:id', requireRole(Role.ADMIN), validate(cycleIdParamSchema, 'params'), validate(updateCycleSchema), cyclesController.updateCycle);
cyclesRouter.get('/:id/status', validate(cycleIdParamSchema, 'params'), cyclesController.getCycleStatus);
