import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createDelegation, listDelegations } from '../controllers/delegations.controller';
import { createDelegationSchema } from '../validators/delegation.validators';

export const delegationsRouter = Router();

delegationsRouter.use(requireAuth);
delegationsRouter.get('/', listDelegations);
delegationsRouter.post('/', validate(createDelegationSchema), createDelegation);
