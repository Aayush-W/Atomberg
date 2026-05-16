import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { escalationsService } from '@/services/services';
import { PageHeader, Spinner, ErrorState, Modal } from '@/components/common';
import { Plus, Play, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import type { EscalationRule } from '@/types';
import { format } from 'date-fns';

export default function AdminEscalationsPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Partial<EscalationRule>>({ triggerType: 'GOAL_NOT_SUBMITTED', daysThreshold: 7, isActive: true, escalationChain: [] });

  const { data: rules = [], isLoading: rulesLoading } = useQuery({ queryKey: ['escalation-rules'], queryFn: escalationsService.getRules });
  const { data: log = [], isLoading: logLoading, error, refetch } = useQuery({ queryKey: ['escalation-log'], queryFn: escalationsService.getLog });

  const createMut = useMutation({
    mutationFn: () => escalationsService.createRule(form),
    onSuccess: () => { toast.success('Rule created'); qc.invalidateQueries({ queryKey: ['escalation-rules'] }); setShowAdd(false); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });

  const toggleMut = useMutation({
    mutationFn: (r: EscalationRule) => escalationsService.updateRule(r.id, { isActive: !r.isActive }),
    onSuccess: () => { toast.success('Rule updated'); qc.invalidateQueries({ queryKey: ['escalation-rules'] }); },
  });

  const triggerMut = useMutation({
    mutationFn: escalationsService.triggerManual,
    onSuccess: () => { toast.success('Escalation check triggered'); qc.invalidateQueries({ queryKey: ['escalation-log'] }); },
    onError: () => toast.error('Trigger failed'),
  });

  if (rulesLoading || logLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;
  if (error) return <ErrorState onRetry={refetch}/>;

  const TRIGGER_TYPES = ['GOAL_NOT_SUBMITTED', 'APPROVAL_PENDING', 'CHECKIN_MISSING'];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Escalation Engine" subtitle="Automated notification rules and event log"
        actions={
          <div className="flex gap-2">
            <button onClick={() => triggerMut.mutate()} disabled={triggerMut.isPending} className="btn-secondary btn gap-2"><Play size={14}/>Manual Trigger</button>
            <button onClick={() => setShowAdd(true)} className="btn-primary btn gap-2"><Plus size={16}/>New Rule</button>
          </div>
        }/>

      {/* Rules */}
      <div className="space-y-3">
        <h2 className="font-semibold text-slate-800 dark:text-white">Escalation Rules</h2>
        {rules.map((r) => (
          <div key={r.id} className="card p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold text-slate-800 dark:text-white">{r.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{r.triggerType} · After {r.daysThreshold} days</p>
            </div>
            <button onClick={() => toggleMut.mutate(r)} className={`${r.isActive ? 'text-success-400' : 'text-slate-400'}`}>
              {r.isActive ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
            </button>
          </div>
        ))}
      </div>

      {/* Event log */}
      <div>
        <h2 className="font-semibold text-slate-800 dark:text-white mb-3">Escalation Log</h2>
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Timestamp</th><th>Rule</th><th>Target User</th><th>Level</th><th>Message</th></tr></thead>
            <tbody>
              {(log as any[]).map((entry: any, i: number) => (
                <tr key={i}>
                  <td className="text-xs text-slate-400 whitespace-nowrap">{format(new Date(entry.triggeredAt || entry.createdAt), 'MMM d, HH:mm')}</td>
                  <td className="text-sm text-slate-700 dark:text-slate-200">{entry.ruleName ?? entry.triggerType}</td>
                  <td className="text-sm text-slate-500">{entry.targetUser ?? '—'}</td>
                  <td><span className="badge badge-submitted">L{entry.level ?? 1}</span></td>
                  <td className="text-xs text-slate-400 max-w-[200px] truncate">{entry.message ?? '—'}</td>
                </tr>
              ))}
              {log.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-slate-400">No escalations triggered yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Escalation Rule"
        footer={<><button className="btn-secondary btn btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn-primary btn btn-sm" onClick={() => createMut.mutate()} disabled={createMut.isPending}>{createMut.isPending ? 'Creating…' : 'Create'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Rule Name</label><input value={form.name ?? ''} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="input" placeholder="e.g., Goal Submission Reminder"/></div>
          <div>
            <label className="label">Trigger Type</label>
            <select value={form.triggerType} onChange={(e) => setForm((p) => ({ ...p, triggerType: e.target.value as any }))} className="input">
              {TRIGGER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="label">Days Threshold</label><input type="number" value={form.daysThreshold} onChange={(e) => setForm((p) => ({ ...p, daysThreshold: parseInt(e.target.value) }))} className="input"/></div>
        </div>
      </Modal>
    </div>
  );
}
