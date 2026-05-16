import { Router } from 'express';
import * as checkinsController from '../controllers/checkins.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { checkInIdParamSchema, createCheckInSchema, updateCheckInSchema } from '../validators/checkin.validators';

export const checkinsRouter = Router();

checkinsRouter.use(requireAuth);

checkinsRouter.post('/', validate(createCheckInSchema), checkinsController.createCheckIn);
checkinsRouter.get('/goal/:goalId', checkinsController.listGoalCheckIns);
checkinsRouter.get('/:id', validate(checkInIdParamSchema, 'params'), checkinsController.getCheckIn);
checkinsRouter.put('/:id', validate(checkInIdParamSchema, 'params'), validate(updateCheckInSchema), checkinsController.updateCheckIn);
checkinsRouter.delete('/:id', validate(checkInIdParamSchema, 'params'), checkinsController.deleteCheckIn);
