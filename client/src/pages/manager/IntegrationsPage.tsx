import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PageHeader, Spinner } from '@/components/common';
import { goalsService, integrationsService } from '@/services/services';

const WEBHOOK_SECRET = 'goalforge-demo-secret';

export default function IntegrationsPage() {
  const { data: goals = [], isLoading } = useQuery({ queryKey: ['integration-goals'], queryFn: goalsService.getTeam });
  const [provider, setProvider] = useState<'jira' | 'github'>('jira');
  const [goalId, setGoalId] = useState('');
  const [incrementBy, setIncrementBy] = useState(1);
  const [actualValue, setActualValue] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [note, setNote] = useState('');

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

  const exampleCurl = `curl -X POST "${webhookPath}" \\
  -H "Content-Type: application/json" \\
  -H "x-goalforge-webhook-secret: ${WEBHOOK_SECRET}" \\
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
      <PageHeader title="Zero-Click Integrations" subtitle="Simulate Jira and GitHub webhooks that update goals without manual check-ins" />

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
            <p className="mt-2 text-sm text-slate-400">Use this endpoint from Jira or GitHub automation rules to silently update goal progress whenever work is completed.</p>
            <div className="mt-4 rounded-2xl bg-surface-950 p-4 text-xs text-slate-300">
              <p className="font-semibold text-brand-300">POST {webhookPath}</p>
              <p className="mt-2">Header: <code>x-goalforge-webhook-secret: {WEBHOOK_SECRET}</code></p>
              <p className="mt-1">Body fields: <code>goalId</code>, <code>incrementBy</code>, <code>actualValue</code>, <code>eventTitle</code>, <code>note</code>, <code>quarter</code></p>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 dark:text-white">Example cURL</h2>
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-surface-950 p-4 text-xs text-slate-300 whitespace-pre-wrap">{exampleCurl}</pre>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 dark:text-white">Why It Matters</h2>
            <div className="mt-3 space-y-3 text-sm text-slate-400">
              <p>Jira ticket transitions can increment engineering throughput goals automatically.</p>
              <p>GitHub merge events can update delivery goals with no extra employee clicks.</p>
              <p>Every sync writes to the audit trail, so the automation is visible and reviewable.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
