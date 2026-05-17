import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PageHeader, Spinner } from '@/components/common';
import { goalsService, integrationsService } from '@/services/services';
import { useAuthStore } from '@/stores/authStore';

const WEBHOOK_SECRET = 'goalforge-demo-secret';

export default function IntegrationsPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { data: goals = [], isLoading } = useQuery({ queryKey: ['integration-goals'], queryFn: goalsService.getTeam });
  const { data: webhooks = [] } = useQuery({
    queryKey: ['webhooks'],
    queryFn: integrationsService.getWebhooks,
    enabled: user?.role === 'ADMIN'
  });
  const { data: deliveries = [] } = useQuery({
    queryKey: ['webhook-deliveries'],
    queryFn: integrationsService.getWebhookDeliveries,
    enabled: user?.role === 'ADMIN'
  });
  const { data: flags = [] } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: integrationsService.getFeatureFlags,
    enabled: user?.role === 'ADMIN'
  });

  const [provider, setProvider] = useState<'jira' | 'github'>('jira');
  const [goalId, setGoalId] = useState('');
  const [incrementBy, setIncrementBy] = useState(1);
  const [actualValue, setActualValue] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [note, setNote] = useState('');
  const [webhookForm, setWebhookForm] = useState({
    name: 'Workday Sync',
    url: 'https://example.com/webhooks/goalforge',
    secret: 'demo-webhook-secret',
    subscribedEvents: 'goal.created,goal.updated,checkin.updated,review.generated,risk.detected'
  });

  const selectedGoal = useMemo(() => goals.find((goal) => goal.id === goalId), [goals, goalId]);
  const webhookPath = `/api/integrations/webhooks/${provider}`;

  const syncMut = useMutation({
    mutationFn: () =>
      integrationsService.simulateExternalSync(provider, {
        goalId,
        incrementBy,
        actualValue: actualValue ? Number(actualValue) : undefined,
        eventTitle,
        note
      }),
    onSuccess: (result) => {
      toast.success(result.message);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message ?? 'Failed to sync external event');
    }
  });

  const createWebhookMut = useMutation({
    mutationFn: () =>
      integrationsService.createWebhook({
        name: webhookForm.name,
        url: webhookForm.url,
        secret: webhookForm.secret,
        subscribedEvents: webhookForm.subscribedEvents.split(',').map((value) => value.trim()).filter(Boolean)
      }),
    onSuccess: () => {
      toast.success('Webhook endpoint created');
      qc.invalidateQueries({ queryKey: ['webhooks'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.error?.message ?? 'Failed to create webhook endpoint')
  });

  const testWebhookMut = useMutation({
    mutationFn: (id: string) => integrationsService.testWebhook(id),
    onSuccess: () => {
      toast.success('Test event queued for webhook endpoint');
      qc.invalidateQueries({ queryKey: ['webhook-deliveries'] });
    }
  });

  const featureFlagMut = useMutation({
    mutationFn: ({ key, enabled, description, metadata }: { key: string; enabled: boolean; description?: string; metadata?: Record<string, unknown> }) =>
      integrationsService.updateFeatureFlag(key, enabled, description, metadata),
    onSuccess: () => {
      toast.success('Feature flag updated');
      qc.invalidateQueries({ queryKey: ['feature-flags'] });
    }
  });

  const exampleCurl = `curl -X POST "${webhookPath}" \\
  -H "Content-Type: application/json" \\
  -H "x-goalforge-tenant: ${user?.tenantSlug ?? 'demo-tenant'}" \\
  -H "x-goalforge-webhook-secret: ${WEBHOOK_SECRET}" \\
  -H "Idempotency-Key: integration-demo-001" \\
  -d '{"goalId":"${goalId || '<goal-id>'}","incrementBy":1,"eventTitle":"${provider === 'jira' ? 'Ticket moved to Done' : 'PR merged'}"}'`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!goalId) {
      toast.error('Select a goal first');
      return;
    }
    syncMut.mutate();
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size={32} /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Enterprise Integrations" subtitle="Zero-click work sync, versioned webhook contracts, delivery tracking, and feature-controlled rollout" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <form onSubmit={submit} className="card space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="label">Provider</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value as 'jira' | 'github')} className="input">
                <option value="jira">Jira</option>
                <option value="github">GitHub</option>
              </select>
            </div>
            <div>
              <label className="label">Goal</label>
              <select value={goalId} onChange={(e) => setGoalId(e.target.value)} className="input">
                <option value="">Select goal</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>{goal.user?.name} - {goal.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Increment By</label>
              <input type="number" value={incrementBy} onChange={(e) => setIncrementBy(Number(e.target.value))} className="input" />
            </div>
            <div>
              <label className="label">Override Actual Value</label>
              <input value={actualValue} onChange={(e) => setActualValue(e.target.value)} className="input" placeholder="Optional direct value" />
            </div>
          </div>

          <div>
            <label className="label">Event Title</label>
            <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="input" placeholder={provider === 'jira' ? 'Ticket GF-42 moved to Done' : 'PR #184 merged to main'} />
          </div>
          <div>
            <label className="label">Automation Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="input min-h-[110px]" placeholder="Add payload context or webhook note for the audit trail" />
          </div>

          {selectedGoal ? (
            <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4 text-sm text-slate-200">
              <p className="font-semibold text-brand-300">{selectedGoal.title}</p>
              <p className="mt-1 text-xs text-slate-400">{selectedGoal.user?.name} · {selectedGoal.uomType} target {selectedGoal.target}</p>
            </div>
          ) : null}

          <button type="submit" disabled={syncMut.isPending} className="btn btn-primary">
            {syncMut.isPending ? 'Syncing...' : 'Simulate External Event'}
          </button>
        </form>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 dark:text-white">Webhook Contract</h2>
            <p className="mt-2 text-sm text-slate-400">Use the versioned webhook endpoint with a shared secret and idempotency key so external automations can replay safely.</p>
            <div className="mt-4 rounded-2xl bg-surface-950 p-4 text-xs text-slate-300">
              <p className="font-semibold text-brand-300">POST {webhookPath}</p>
              <p className="mt-2">Headers: <code>x-goalforge-webhook-secret</code>, <code>Idempotency-Key</code>, <code>x-request-id</code></p>
              <p className="mt-1">Body fields: <code>goalId</code>, <code>incrementBy</code>, <code>actualValue</code>, <code>eventTitle</code>, <code>note</code>, <code>quarter</code></p>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 dark:text-white">Example cURL</h2>
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-surface-950 p-4 text-xs text-slate-300 whitespace-pre-wrap">{exampleCurl}</pre>
          </div>
        </div>
      </div>

      {user?.role === 'ADMIN' ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 dark:text-white">Webhook Endpoints</h2>
            <div className="mt-4 space-y-3">
              <input className="input" value={webhookForm.name} onChange={(e) => setWebhookForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Endpoint name" />
              <input className="input" value={webhookForm.url} onChange={(e) => setWebhookForm((prev) => ({ ...prev, url: e.target.value }))} placeholder="Endpoint URL" />
              <input className="input" value={webhookForm.secret} onChange={(e) => setWebhookForm((prev) => ({ ...prev, secret: e.target.value }))} placeholder="Signing secret" />
              <input className="input" value={webhookForm.subscribedEvents} onChange={(e) => setWebhookForm((prev) => ({ ...prev, subscribedEvents: e.target.value }))} placeholder="Comma-separated events" />
              <button className="btn btn-primary" onClick={() => createWebhookMut.mutate()} disabled={createWebhookMut.isPending}>
                {createWebhookMut.isPending ? 'Creating...' : 'Create Webhook Endpoint'}
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {webhooks.map((endpoint) => (
                <div key={endpoint.id} className="rounded-xl border border-surface-200 p-3 dark:border-surface-800">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">{endpoint.name}</p>
                      <p className="text-xs text-slate-400">{endpoint.url}</p>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => testWebhookMut.mutate(endpoint.id)}>
                      Send Test
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Failures: {endpoint.failureCount} · Active: {String(endpoint.isActive)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 dark:text-white">Feature Flags</h2>
            <div className="mt-4 space-y-3">
              {flags.map((flag) => (
                <div key={flag.id} className="flex items-center justify-between rounded-xl border border-surface-200 p-3 dark:border-surface-800">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">{flag.key}</p>
                    <p className="text-xs text-slate-400">{flag.description}</p>
                  </div>
                  <button className={`btn ${flag.enabled ? 'btn-secondary' : 'btn-primary'}`} onClick={() => featureFlagMut.mutate({ key: flag.key, enabled: !flag.enabled, description: flag.description ?? undefined, metadata: flag.metadata })}>
                    {flag.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5 xl:col-span-2">
            <h2 className="font-semibold text-slate-800 dark:text-white">Recent Webhook Deliveries</h2>
            <div className="mt-4 table-container rounded-none border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>Response</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.slice(0, 12).map((delivery) => (
                    <tr key={delivery.id}>
                      <td className="text-xs text-slate-400">{delivery.endpoint?.name ?? 'Endpoint'}</td>
                      <td className="text-xs text-slate-400">{delivery.eventName}</td>
                      <td className="text-xs text-slate-400">{delivery.status}</td>
                      <td className="text-xs text-slate-400">{delivery.attemptCount}</td>
                      <td className="text-xs text-slate-400">{delivery.statusCode ?? 'n/a'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
