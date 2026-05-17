import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createKudos, listKudos } from '../controllers/kudos.controller';
import { createKudosSchema } from '../validators/kudos.validators';

export const kudosRouter = Router();

kudosRouter.use(requireAuth);
kudosRouter.get('/', listKudos);
kudosRouter.post('/', validate(createKudosSchema), createKudos);
