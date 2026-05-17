import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { startEscalationJob } from './jobs/escalation.job';
import { startWebhookRetryJob } from './jobs/webhookDelivery.job';
import { requestLogger } from './middleware/requestLogger.middleware';

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'goalforge-backend' });
});

app.get('/api/version', (_req: Request, res: Response) => {
  res.json({ version: '0.1.0', environment: process.env.NODE_ENV || 'development' });
});

app.use('/api', apiRouter);
app.use('/api/v1', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`GoalForge backend listening on port ${port}`);
  startEscalationJob();
  startWebhookRetryJob();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
