import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Send, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { goalsService } from '@/services/services';
import { PageHeader, StatusBadge, Spinner, ErrorState, EmptyState, Modal } from '@/components/common';
import type { Goal } from '@/types';

export default function GoalsPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: goals = [], isLoading, error, refetch } = useQuery({
    queryKey: ['my-goals'], queryFn: goalsService.getMine,
  });

  const totalWeight = goals.reduce((s, g) => s + g.weightage, 0);
  const weightOk = Math.abs(totalWeight - 100) < 0.01;

  const deleteMut = useMutation({
    mutationFn: (id: string) => goalsService.delete(id),
    onSuccess: () => { toast.success('Goal deleted'); qc.invalidateQueries({ queryKey: ['my-goals'] }); setDeleteId(null); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed to delete'),
  });

  const submitMut = useMutation({
    mutationFn: () =>
      Promise.all(goals.filter((g) => g.status === 'DRAFT' || g.status === 'REJECTED').map((g) => goalsService.submit(g.id))),
    onSuccess: () => { toast.success('Goals submitted for approval'); qc.invalidateQueries({ queryKey: ['my-goals'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed to submit'),
  });

  const handleSubmitAll = () => {
    if (!weightOk) { toast.error(`Weightage must total 100%. Current: ${totalWeight}%`); return; }
    submitMut.mutate();
  };

  const STATUS_FLOW = ['DRAFT', 'SUBMITTED', 'APPROVED / REJECTED', 'LOCKED'];

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;
  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="My Goals" subtitle="Manage your goals for the active cycle"
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Link to="/employee/goals/new" className="btn-primary btn w-full gap-2 sm:w-auto"><Plus size={16}/>New Goal</Link>
            <button onClick={handleSubmitAll} disabled={goals.length === 0 || submitMut.isPending}
              className="btn-secondary btn w-full gap-2 sm:w-auto"><Send size={15}/>Submit All</button>
          </div>
        } />

      {/* Status flow */}
      <div className="card p-4 flex items-center gap-2 flex-wrap">
        {STATUS_FLOW.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-surface-100 dark:bg-surface-800 text-slate-600 dark:text-slate-300">{s}</span>
            {i < STATUS_FLOW.length - 1 && <ChevronRight size={14} className="text-slate-400"/>}
          </div>
        ))}
      </div>

      {/* Weightage bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Weightage</span>
          <span className={`text-sm font-bold ${weightOk ? 'text-success-500' : 'text-danger-500'}`}>{totalWeight}% / 100%</span>
        </div>
        <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${weightOk ? 'bg-success-500' : totalWeight > 100 ? 'bg-danger-500' : 'bg-warning-500'}`}
            style={{ width: `${Math.min(totalWeight, 100)}%` }}/>
        </div>
        {!weightOk && goals.length > 0 && <p className="text-xs text-danger-400 mt-1.5">⚠ Weightage must total exactly 100% before submission</p>}
      </div>

      {/* Goals list */}
      {goals.length === 0 ? (
        <EmptyState title="No goals yet" description="Create your first goal to get started."
          action={<Link to="/employee/goals/new" className="btn-primary btn btn-sm"><Plus size={14}/>Add Goal</Link>}/>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => (
            <div key={g.id} className="card p-0 overflow-hidden">
              <div className="flex cursor-pointer items-start gap-4 px-4 py-4 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50 sm:px-5"
                onClick={() => setExpanded(expanded === g.id ? null : g.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 dark:text-white">{g.title}</p>
                    <StatusBadge status={g.status}/>
                    {g.isShared && <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">Shared</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{g.thrustArea} · {g.uomType} · Target: {g.target} · Weight: {g.weightage}%</p>
                </div>
                <div className="flex items-center gap-2 self-start">
                  {g.status === 'DRAFT' && (
                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(g.id); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all"><Trash2 size={15}/></button>
                  )}
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${expanded === g.id ? 'rotate-180' : ''}`}/>
                </div>
              </div>
              {expanded === g.id && (
                <div className="space-y-3 border-t border-surface-100 px-4 pb-4 pt-4 dark:border-surface-800 sm:px-5">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{g.description}</p>
                  </div>
                  {g.managerComment && (
                    <div className="rounded-xl bg-warning-500/10 border border-warning-500/20 p-3">
                      <p className="text-xs font-semibold text-warning-400 mb-1">Manager Comment</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{g.managerComment}</p>
                    </div>
                  )}
                  {g.checkIns && g.checkIns.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Check-in History</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {g.checkIns.map((ci) => (
                          <div key={ci.id} className="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                            <div className="flex items-center justify-between">
                              <StatusBadge status={ci.quarter}/>
                              <span className="text-xs font-bold text-brand-400">{ci.progressScore.toFixed(0)}%</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Actual: {ci.actualValue} · <StatusBadge status={ci.status}/></p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Goal"
        footer={<>
          <button className="btn-secondary btn btn-sm" onClick={() => setDeleteId(null)}>Cancel</button>
          <button className="btn-danger btn btn-sm" onClick={() => deleteMut.mutate(deleteId!)} disabled={deleteMut.isPending}>
            {deleteMut.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </>}>
        <p className="text-sm text-slate-600 dark:text-slate-300">Are you sure you want to delete this goal? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
