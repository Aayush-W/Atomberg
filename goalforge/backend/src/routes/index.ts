import { Router } from 'express';
import { authRouter } from './auth.routes';
import { cyclesRouter } from './cycles.routes';
import { goalsRouter } from './goals.routes';
import { usersRouter } from './users.routes';
import { checkinsRouter } from './checkins.routes';
import { reportsRouter } from './reports.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/cycles', cyclesRouter);
apiRouter.use('/goals', goalsRouter);
apiRouter.use('/checkins', checkinsRouter);
apiRouter.use('/reports', reportsRouter);
