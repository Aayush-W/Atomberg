import axios from 'axios';
import { createHmac, randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { isFeatureEnabled } from './featureFlag.service';

type EmitDomainEventInput = {
  tenantId: string;
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  correlationId?: string;
};

function buildEventEnvelope(args: {
  eventId: string;
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  correlationId?: string;
}) {
  return {
    id: args.eventId,
    version: '1.0',
    event: args.eventName,
    aggregateType: args.aggregateType,
    aggregateId: args.aggregateId,
    occurredAt: new Date().toISOString(),
    correlationId: args.correlationId ?? randomUUID(),
    payload: args.payload
  };
}

function signPayload(secret: string, timestamp: string, body: string) {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

async function attemptDelivery(deliveryId: string, endpoint: { id: string; url: string; secret: string }, body: Record<string, unknown>) {
  const serialized = JSON.stringify(body);
  const timestamp = new Date().toISOString();
  const signature = signPayload(endpoint.secret, timestamp, serialized);

  try {
    const response = await axios.post(endpoint.url, body, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'x-goalforge-timestamp': timestamp,
        'x-goalforge-signature': signature,
        'x-goalforge-delivery-id': deliveryId,
        'x-goalforge-event-version': '1.0'
      }
    });

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'DELIVERED',
        statusCode: response.status,
        responseBody: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
        deliveredAt: new Date(),
        nextRetryAt: null,
        attemptCount: { increment: 1 }
      }
    });

    await prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: {
        lastDeliveredAt: new Date(),
        failureCount: 0
      }
    });

    return true;
  } catch (error: any) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'FAILED',
        statusCode: error?.response?.status ?? null,
        responseBody: error?.response?.data ? JSON.stringify(error.response.data) : error?.message ?? 'Webhook delivery failed',
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
        attemptCount: { increment: 1 }
      }
    });

    await prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: {
        failureCount: { increment: 1 }
      }
    });

    return false;
  }
}

export async function emitDomainEvent(input: EmitDomainEventInput) {
  const event = await prisma.domainEvent.create({
    data: {
      tenantId: input.tenantId,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventName: input.eventName,
      payload: input.payload as any,
      correlationId: input.correlationId,
      status: 'PENDING'
    }
  });

  if (!(await isFeatureEnabled(input.tenantId, 'outbound-webhooks'))) {
    await prisma.domainEvent.update({
      where: { id: event.id },
      data: {
        status: 'RECORDED',
        publishedAt: new Date()
      }
    });
    return event;
  }

  const endpoints = (await prisma.webhookEndpoint.findMany({
    where: { tenantId: input.tenantId, isActive: true },
    orderBy: { createdAt: 'asc' }
  })).filter((endpoint) => {
    const subscribed = Array.isArray(endpoint.subscribedEvents) ? endpoint.subscribedEvents : [];
    return subscribed.includes(input.eventName);
  });

  if (endpoints.length === 0) {
    await prisma.domainEvent.update({
      where: { id: event.id },
      data: {
        status: 'NO_SUBSCRIBERS',
        publishedAt: new Date()
      }
    });
    return event;
  }

  const envelope = buildEventEnvelope({
    eventId: event.id,
    eventName: input.eventName,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    payload: input.payload,
    correlationId: input.correlationId
  });

  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          tenantId: input.tenantId,
          endpointId: endpoint.id,
          eventId: event.id,
          eventName: input.eventName,
          requestBody: envelope as any,
          status: 'PENDING'
        }
      });

      return attemptDelivery(delivery.id, endpoint, envelope);
    })
  );

  await prisma.domainEvent.update({
    where: { id: event.id },
    data: {
      status: results.every(Boolean) ? 'PUBLISHED' : results.some(Boolean) ? 'PARTIAL_FAILURE' : 'FAILED',
      publishedAt: new Date()
    }
  });

  return event;
}

export async function retryPendingWebhookDeliveries() {
  const deliveries = await prisma.webhookDelivery.findMany({
    where: {
      status: { in: ['FAILED', 'PENDING'] },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
      endpoint: { isActive: true }
    },
    include: {
      endpoint: true
    },
    orderBy: { createdAt: 'asc' },
    take: 50
  });

  for (const delivery of deliveries) {
    await attemptDelivery(delivery.id, delivery.endpoint, delivery.requestBody as Record<string, unknown>);
  }

  return deliveries.length;
}
