import cron from 'node-cron';
import { retryPendingWebhookDeliveries } from '../services/domainEvent.service';

export async function runWebhookRetryJob() {
  const retried = await retryPendingWebhookDeliveries();
  console.log(`[Webhooks] Retry sweep complete. Attempted ${retried} delivery(s).`);
}

export function startWebhookRetryJob() {
  cron.schedule('*/10 * * * *', runWebhookRetryJob);
  console.log('[Webhooks] Retry job registered (every 10m)');
}
