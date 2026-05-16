import { Router } from 'express';
import { authRouter } from './auth.routes';
import { cyclesRouter } from './cycles.routes';
import { goalsRouter } from './goals.routes';
import { usersRouter } from './users.routes';
import { checkinsRouter } from './checkins.routes';
import { reportsRouter } from './reports.routes';
import { auditRouter } from './audit.routes';
import { notificationsRouter } from './notifications.routes';
import { escalationsRouter } from './escalations.routes';
import { aiRouter } from './ai.routes';
import { mlRouter } from './ml.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/cycles', cyclesRouter);
apiRouter.use('/goals', goalsRouter);
apiRouter.use('/checkins', checkinsRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/audit', auditRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/escalations', escalationsRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/ml', mlRouter);
