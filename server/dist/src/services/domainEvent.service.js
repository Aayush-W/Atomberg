"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitDomainEvent = emitDomainEvent;
exports.retryPendingWebhookDeliveries = retryPendingWebhookDeliveries;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
const prisma_1 = require("../lib/prisma");
const featureFlag_service_1 = require("./featureFlag.service");
function buildEventEnvelope(args) {
    return {
        id: args.eventId,
        version: '1.0',
        event: args.eventName,
        aggregateType: args.aggregateType,
        aggregateId: args.aggregateId,
        occurredAt: new Date().toISOString(),
        correlationId: args.correlationId ?? (0, crypto_1.randomUUID)(),
        payload: args.payload
    };
}
function signPayload(secret, timestamp, body) {
    return (0, crypto_1.createHmac)('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}
async function attemptDelivery(deliveryId, endpoint, body) {
    const serialized = JSON.stringify(body);
    const timestamp = new Date().toISOString();
    const signature = signPayload(endpoint.secret, timestamp, serialized);
    try {
        const response = await axios_1.default.post(endpoint.url, body, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'x-goalforge-timestamp': timestamp,
                'x-goalforge-signature': signature,
                'x-goalforge-delivery-id': deliveryId,
                'x-goalforge-event-version': '1.0'
            }
        });
        await prisma_1.prisma.webhookDelivery.update({
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
        await prisma_1.prisma.webhookEndpoint.update({
            where: { id: endpoint.id },
            data: {
                lastDeliveredAt: new Date(),
                failureCount: 0
            }
        });
        return true;
    }
    catch (error) {
        await prisma_1.prisma.webhookDelivery.update({
            where: { id: deliveryId },
            data: {
                status: 'FAILED',
                statusCode: error?.response?.status ?? null,
                responseBody: error?.response?.data ? JSON.stringify(error.response.data) : error?.message ?? 'Webhook delivery failed',
                nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
                attemptCount: { increment: 1 }
            }
        });
        await prisma_1.prisma.webhookEndpoint.update({
            where: { id: endpoint.id },
            data: {
                failureCount: { increment: 1 }
            }
        });
        return false;
    }
}
async function emitDomainEvent(input) {
    const event = await prisma_1.prisma.domainEvent.create({
        data: {
            tenantId: input.tenantId,
            aggregateType: input.aggregateType,
            aggregateId: input.aggregateId,
            eventName: input.eventName,
            payload: input.payload,
            correlationId: input.correlationId,
            status: 'PENDING'
        }
    });
    if (!(await (0, featureFlag_service_1.isFeatureEnabled)(input.tenantId, 'outbound-webhooks'))) {
        await prisma_1.prisma.domainEvent.update({
            where: { id: event.id },
            data: {
                status: 'RECORDED',
                publishedAt: new Date()
            }
        });
        return event;
    }
    const endpoints = (await prisma_1.prisma.webhookEndpoint.findMany({
        where: { tenantId: input.tenantId, isActive: true },
        orderBy: { createdAt: 'asc' }
    })).filter((endpoint) => {
        const subscribed = Array.isArray(endpoint.subscribedEvents) ? endpoint.subscribedEvents : [];
        return subscribed.includes(input.eventName);
    });
    if (endpoints.length === 0) {
        await prisma_1.prisma.domainEvent.update({
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
    const results = await Promise.all(endpoints.map(async (endpoint) => {
        const delivery = await prisma_1.prisma.webhookDelivery.create({
            data: {
                tenantId: input.tenantId,
                endpointId: endpoint.id,
                eventId: event.id,
                eventName: input.eventName,
                requestBody: envelope,
                status: 'PENDING'
            }
        });
        return attemptDelivery(delivery.id, endpoint, envelope);
    }));
    await prisma_1.prisma.domainEvent.update({
        where: { id: event.id },
        data: {
            status: results.every(Boolean) ? 'PUBLISHED' : results.some(Boolean) ? 'PARTIAL_FAILURE' : 'FAILED',
            publishedAt: new Date()
        }
    });
    return event;
}
async function retryPendingWebhookDeliveries() {
    const deliveries = await prisma_1.prisma.webhookDelivery.findMany({
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
        await attemptDelivery(delivery.id, delivery.endpoint, delivery.requestBody);
    }
    return deliveries.length;
}
