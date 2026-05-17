"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = require("./lib/prisma");
const routes_1 = require("./routes");
const error_middleware_1 = require("./middleware/error.middleware");
const escalation_job_1 = require("./jobs/escalation.job");
const webhookDelivery_job_1 = require("./jobs/webhookDelivery.job");
const requestLogger_middleware_1 = require("./middleware/requestLogger.middleware");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use(requestLogger_middleware_1.requestLogger);
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'goalforge-backend' });
});
app.get('/api/version', (_req, res) => {
    res.json({ version: '0.1.0', environment: process.env.NODE_ENV || 'development' });
});
app.use('/api', routes_1.apiRouter);
app.use('/api/v1', routes_1.apiRouter);
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
const server = app.listen(port, () => {
    console.log(`GoalForge backend listening on port ${port}`);
    (0, escalation_job_1.startEscalationJob)();
    (0, webhookDelivery_job_1.startWebhookRetryJob)();
});
process.on('SIGINT', async () => {
    await prisma_1.prisma.$disconnect();
    server.close(() => process.exit(0));
});
process.on('SIGTERM', async () => {
    await prisma_1.prisma.$disconnect();
    server.close(() => process.exit(0));
});
