import { Role } from '@prisma/client';
import { Router } from 'express';
import * as goalsController from '../controllers/goals.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  approveGoalSchema,
  createGoalSchema,
  dependencySchema,
  goalIdParamSchema,
  importGoalPortfolioSchema,
  rejectGoalSchema,
  sharedGoalSchema,
  updateGoalSchema
} from '../validators/goal.validators';

export const goalsRouter = Router();

goalsRouter.use(requireAuth);

goalsRouter.get('/', goalsController.listOwnGoals);
goalsRouter.get('/team', requireRole(Role.MANAGER, Role.ADMIN), goalsController.listTeamGoals);
goalsRouter.get('/all', requireRole(Role.ADMIN), goalsController.listAllGoals);
goalsRouter.post('/', requireRole(Role.EMPLOYEE), validate(createGoalSchema), goalsController.createGoal);
goalsRouter.post('/portfolio/import', requireRole(Role.EMPLOYEE), validate(importGoalPortfolioSchema), goalsController.importGoalPortfolio);
goalsRouter.post('/shared', requireRole(Role.MANAGER, Role.ADMIN), validate(sharedGoalSchema), goalsController.createSharedGoal);
goalsRouter.get('/dependency-graph', goalsController.getDependencyGraph);
goalsRouter.get('/:id/audit', validate(goalIdParamSchema, 'params'), goalsController.getGoalAudit);
goalsRouter.put('/:id', validate(goalIdParamSchema, 'params'), validate(updateGoalSchema), goalsController.updateGoal);
goalsRouter.delete('/:id', validate(goalIdParamSchema, 'params'), goalsController.deleteGoal);
goalsRouter.post('/:id/submit', validate(goalIdParamSchema, 'params'), goalsController.submitGoal);
goalsRouter.post('/:id/approve', requireRole(Role.MANAGER, Role.ADMIN), validate(goalIdParamSchema, 'params'), validate(approveGoalSchema), goalsController.approveGoal);
goalsRouter.post('/:id/reject', requireRole(Role.MANAGER, Role.ADMIN), validate(goalIdParamSchema, 'params'), validate(rejectGoalSchema), goalsController.rejectGoal);
goalsRouter.post('/:id/unlock', requireRole(Role.ADMIN), validate(goalIdParamSchema, 'params'), goalsController.unlockGoal);
goalsRouter.get('/:id', validate(goalIdParamSchema, 'params'), goalsController.getGoal);
goalsRouter.post('/:id/dependency', validate(goalIdParamSchema, 'params'), validate(dependencySchema), goalsController.addDependency);
