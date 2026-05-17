# GoalForge Webhooks

GoalForge now supports tenant-aware inbound sync webhooks and signed outbound domain-event webhooks.

## 1. Inbound sync webhooks

Use the versioned endpoint:

`POST /api/v1/integrations/webhooks/:provider`

Required headers:

- `x-goalforge-tenant`: tenant slug, for example `demo-tenant`
- `x-goalforge-webhook-secret`: tenant webhook secret
- `idempotency-key`: unique key per external event replay

Example request:

```bash
curl -X POST "http://localhost:4000/api/v1/integrations/webhooks/jira" \
  -H "Content-Type: application/json" \
  -H "x-goalforge-tenant: demo-tenant" \
  -H "x-goalforge-webhook-secret: goalforge-demo-secret" \
  -H "idempotency-key: jira-GF-42-done" \
  -d '{
    "goalId": "<goal-id>",
    "incrementBy": 1,
    "eventTitle": "Ticket GF-42 moved to Done",
    "note": "Auto-synced from Jira workflow"
  }'
```

## 2. Outbound domain-event webhooks

When the `outbound-webhooks` feature flag is enabled, GoalForge signs every outbound delivery with HMAC-SHA256.

Headers sent by GoalForge:

- `x-goalforge-timestamp`
- `x-goalforge-signature`
- `x-goalforge-delivery-id`
- `x-goalforge-event-version`

Signature algorithm:

`hex(hmac_sha256(secret, "<timestamp>.<raw-body>"))`

## 3. Verify outbound signatures in Node.js

```ts
import crypto from 'crypto';

export function verifyGoalForgeSignature(rawBody: string, timestamp: string, signature: string, secret: string) {
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}
```

Example Express handler:

```ts
app.post('/goalforge/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const rawBody = req.body.toString('utf8');
  const timestamp = req.header('x-goalforge-timestamp') ?? '';
  const signature = req.header('x-goalforge-signature') ?? '';

  const isValid = verifyGoalForgeSignature(rawBody, timestamp, signature, process.env.GOALFORGE_SIGNING_SECRET!);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(rawBody);
  console.log('Accepted GoalForge event', event.event, event.id);
  return res.status(200).json({ ok: true });
});
```

## 4. Event envelope

Outbound events use this shape:

```json
{
  "id": "evt_123",
  "version": "1.0",
  "event": "goal.updated",
  "aggregateType": "goal",
  "aggregateId": "goal_123",
  "occurredAt": "2026-05-17T18:30:00.000Z",
  "correlationId": "corr_123",
  "payload": {
    "goalId": "goal_123",
    "actorUserId": "user_123"
  }
}
```
