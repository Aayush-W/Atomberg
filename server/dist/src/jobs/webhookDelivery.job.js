"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWebhookRetryJob = runWebhookRetryJob;
exports.startWebhookRetryJob = startWebhookRetryJob;
const node_cron_1 = __importDefault(require("node-cron"));
const domainEvent_service_1 = require("../services/domainEvent.service");
async function runWebhookRetryJob() {
    const retried = await (0, domainEvent_service_1.retryPendingWebhookDeliveries)();
    console.log(`[Webhooks] Retry sweep complete. Attempted ${retried} delivery(s).`);
}
function startWebhookRetryJob() {
    node_cron_1.default.schedule('*/10 * * * *', runWebhookRetryJob);
    console.log('[Webhooks] Retry job registered (every 10m)');
}
