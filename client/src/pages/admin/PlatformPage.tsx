import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Boxes, Flag, Globe2, ShieldCheck, Webhook } from 'lucide-react';
import { ErrorState, PageHeader, Spinner, StatCard } from '@/components/common';
import { integrationsService } from '@/services/services';
import { useAuthStore } from '@/stores/authStore';

export default function AdminPlatformPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [webhookForm, setWebhookForm] = useState({
    name: 'Workday Connector',
    url: 'https://example.com/webhooks/goalforge',
    secret: 'demo-webhook-secret',
    subscribedEvents: 'goal.created,goal.updated,checkin.updated,review.generated,risk.detected'
  });

  const {
    data: platform,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['platform-overview'],
    queryFn: integrationsService.getPlatformOverview,
    enabled: user?.role === 'ADMIN'
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
      qc.invalidateQueries({ queryKey: ['platform-overview'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.error?.message ?? 'Failed to create webhook endpoint')
  });

  const testWebhookMut = useMutation({
    mutationFn: (id: string) => integrationsService.testWebhook(id),
    onSuccess: () => {
      toast.success('Test event queued');
      qc.invalidateQueries({ queryKey: ['platform-overview'] });
    }
  });

  const featureFlagMut = useMutation({
    mutationFn: ({ key, enabled, description, metadata }: { key: string; enabled: boolean; description?: string; metadata?: Record<string, unknown> }) =>
      integrationsService.updateFeatureFlag(key, enabled, description, metadata),
    onSuccess: () => {
      toast.success('Feature flag updated');
      qc.invalidateQueries({ queryKey: ['platform-overview'] });
    }
  });

  const docsSnippet = useMemo(
    () =>
      `POST /api/v1/integrations/webhooks/jira
x-goalforge-tenant: ${user?.tenantSlug ?? 'demo-tenant'}
x-goalforge-webhook-secret: <tenant-secret>
idempotency-key: ext-sync-001

Sign outbound deliveries with HMAC-SHA256 over: <timestamp>.<raw-body>`,
    [user?.tenantSlug]
  );

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size={32} /></div>;
  if (error || !platform) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Platform"
        subtitle="Tenant-aware webhook operations, rollout controls, and event monitoring for enterprise integrations"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Tenant" value={platform.tenant?.slug ?? 'n/a'} icon={<Globe2 size={18} />} color="brand" />
        <StatCard title="Active Webhooks" value={platform.summary.activeWebhookEndpoints} icon={<Webhook size={18} />} color="success" />
        <StatCard title="Enabled Flags" value={platform.summary.enabledFlags} icon={<Flag size={18} />} color="warning" />
        <StatCard title="Recent Failures" value={platform.summary.recentDeliveryFailures} icon={<AlertTriangle size={18} />} color="danger" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">Tenant Identity</h2>
              <p className="mt-1 text-sm text-slate-400">Each integration surface is isolated to the signed-in tenant.</p>
            </div>
            <ShieldCheck size={18} className="text-brand-400" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-900/60">
              <p className="text-xs text-slate-400">Tenant Name</p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-white">{platform.tenant?.name ?? 'Unknown'}</p>
            </div>
            <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-900/60">
              <p className="text-xs text-slate-400">Slug</p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-white">{platform.tenant?.slug ?? 'n/a'}</p>
            </div>
            <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-900/60">
              <p className="text-xs text-slate-400">Recorded Events</p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-white">{platform.summary.recordedEvents}</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-white">External Contract</h2>
          <p className="mt-1 text-sm text-slate-400">Use `/api/v1` plus tenant and HMAC headers for production consumers.</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-surface-950 p-4 text-xs text-slate-300 whitespace-pre-wrap">{docsSnippet}</pre>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-white">Webhook Endpoints</h2>
          <div className="mt-4 space-y-3">
            <input className="input" value={webhookForm.name} onChange={(e) => setWebhookForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Endpoint name" />
            <input className="input" value={webhookForm.url} onChange={(e) => setWebhookForm((prev) => ({ ...prev, url: e.target.value }))} placeholder="Endpoint URL" />
            <input className="input" value={webhookForm.secret} onChange={(e) => setWebhookForm((prev) => ({ ...prev, secret: e.target.value }))} placeholder="Signing secret" />
            <input className="input" value={webhookForm.subscribedEvents} onChange={(e) => setWebhookForm((prev) => ({ ...prev, subscribedEvents: e.target.value }))} placeholder="Comma-separated events" />
            <button className="btn btn-primary" onClick={() => createWebhookMut.mutate()} disabled={createWebhookMut.isPending}>
              {createWebhookMut.isPending ? 'Creating...' : 'Add Endpoint'}
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {platform.endpoints.map((endpoint) => (
              <div key={endpoint.id} className="rounded-2xl border border-surface-200 p-4 dark:border-surface-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">{endpoint.name}</p>
                    <p className="text-xs text-slate-400">{endpoint.url}</p>
                    <p className="mt-2 text-xs text-slate-500">Failures {endpoint.failureCount} • Active {String(endpoint.isActive)}</p>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => testWebhookMut.mutate(endpoint.id)}>
                    Test
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-white">Feature Flags</h2>
          <div className="mt-4 space-y-3">
            {platform.flags.map((flag) => (
              <div key={flag.id} className="flex items-center justify-between rounded-2xl border border-surface-200 p-4 dark:border-surface-800">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{flag.key}</p>
                  <p className="text-xs text-slate-400">{flag.description}</p>
                </div>
                <button
                  className={`btn ${flag.enabled ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() =>
                    featureFlagMut.mutate({
                      key: flag.key,
                      enabled: !flag.enabled,
                      description: flag.description ?? undefined,
                      metadata: flag.metadata
                    })
                  }
                >
                  {flag.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-surface-100 px-5 py-4 dark:border-surface-800">
            <h2 className="font-semibold text-slate-800 dark:text-white">Recent Deliveries</h2>
          </div>
          <div className="table-container rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {platform.deliveries.slice(0, 12).map((delivery) => (
                  <tr key={delivery.id}>
                    <td className="text-xs text-slate-400">{delivery.eventName}</td>
                    <td className="text-xs text-slate-400">{delivery.status}</td>
                    <td className="text-xs text-slate-400">{delivery.attemptCount}</td>
                    <td className="text-xs text-slate-400">{formatDistanceToNow(new Date(delivery.createdAt), { addSuffix: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-100 px-5 py-4 dark:border-surface-800">
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">Domain Event Stream</h2>
              <p className="mt-0.5 text-xs text-slate-400">Recent tenant-scoped business events</p>
            </div>
            <Boxes size={18} className="text-brand-400" />
          </div>
          <div className="divide-y divide-surface-100 dark:divide-surface-800">
            {platform.events.slice(0, 10).map((event) => (
              <div key={event.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">{event.eventName}</p>
                    <p className="text-xs text-slate-400">{event.aggregateType} • {event.aggregateId}</p>
                  </div>
                  <span className="text-xs text-slate-500">{event.status}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
