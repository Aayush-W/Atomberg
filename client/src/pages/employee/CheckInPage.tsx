import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { MessageSquare, Calculator } from 'lucide-react';
import { goalsService, checkinsService, cyclesService } from '@/services/services';
import { PageHeader, Spinner, ErrorState, StatusBadge } from '@/components/common';
import type { Quarter, CheckInStatus, Goal } from '@/types';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

function calcScore(goal: Goal, actual: number, completionDate?: string): number {
  const { uomType, target, targetDate } = goal;
  if (uomType === 'MIN') return Math.min((actual / target) * 100, 120);
  if (uomType === 'MAX') return actual === 0 ? 120 : Math.min((target / actual) * 100, 120);
  if (uomType === 'ZERO') return actual === 0 ? 100 : 0;
  if (uomType === 'TIMELINE' && completionDate && targetDate) {
    const diff = (new Date(completionDate).getTime() - new Date(targetDate).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, 100 - Math.max(0, diff / 30) * 10);
  }
  return 0;
}

export default function CheckInPage() {
  const qc = useQueryClient();
  const [activeQ, setActiveQ] = useState<Quarter>('Q1');
  const [values, setValues] = useState<Record<string, { actual: number; status: CheckInStatus; completionDate?: string }>>({});

  const { data: goals = [], isLoading, error, refetch } = useQuery({ queryKey: ['my-goals'], queryFn: goalsService.getMine });
  const { data: cycleStatus } = useQuery({
    queryKey: ['cycle-status'],
    queryFn: async () => { 
      const c = await cyclesService.getActive(); 
      if (!c) return null;
      return cyclesService.getStatus(c.id); 
    },
  });

  const submitMut = useMutation({
    mutationFn: async () => {
      const cycle = await cyclesService.getActive();
      return Promise.all(
        goals.filter((g) => ['APPROVED', 'LOCKED'].includes(g.status)).map((g) => {
          const v = values[g.id] || { actual: 0, status: 'NOT_STARTED' as CheckInStatus };
          const score = calcScore(g, v.actual, v.completionDate);
          return checkinsService.create({
            goalId: g.id, userId: '', quarter: activeQ,
            actualValue: v.actual, status: v.status,
            progressScore: score, completionDate: v.completionDate,
          });
        })
      );
    },
    onSuccess: () => { toast.success('Check-ins submitted!'); qc.invalidateQueries({ queryKey: ['my-goals'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Submission failed'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;
  if (error) return <ErrorState onRetry={refetch}/>;

  const approvedGoals = goals.filter((g) => ['APPROVED', 'LOCKED'].includes(g.status));
  const windowOpen = cycleStatus?.activeQuarter != null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Quarterly Check-In" subtitle="Submit your progress for each goal"/>

      {!windowOpen && (
        <div className="card p-5 text-center">
          <p className="text-slate-500 text-sm">No check-in window is currently open.</p>
          {cycleStatus?.nextWindowDate && <p className="text-xs text-slate-400 mt-1">Next window opens: {cycleStatus.nextWindowDate}</p>}
        </div>
      )}

      {/* Quarter tabs */}
      <div className="flex gap-2">
        {QUARTERS.map((q) => (
          <button key={q} onClick={() => setActiveQ(q)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeQ === q ? 'bg-brand-600 text-white' : 'bg-surface-100 dark:bg-surface-800 text-slate-500 hover:text-slate-800 dark:hover:text-white'} ${q !== (cycleStatus?.activeQuarter ?? 'Q1') && q > (cycleStatus?.activeQuarter ?? 'Q1') ? 'opacity-40 pointer-events-none' : ''}`}>
            {q}
          </button>
        ))}
      </div>

      {approvedGoals.length === 0 ? (
        <div className="card p-8 text-center text-slate-400 text-sm">No approved goals to check in. Get your goals approved first.</div>
      ) : (
        <div className="space-y-4">
          {approvedGoals.map((g) => {
            const v = values[g.id] || { actual: 0, status: 'NOT_STARTED' as CheckInStatus };
            const previewScore = calcScore(g, v.actual, v.completionDate);
            return (
              <div key={g.id} className="card p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{g.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{g.thrustArea} · Target: {g.target} · <StatusBadge status={g.uomType}/></p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">Preview Score</p>
                    <p className={`text-2xl font-display font-bold ${previewScore >= 80 ? 'text-success-400' : previewScore >= 60 ? 'text-warning-400' : 'text-danger-400'}`}>{previewScore.toFixed(0)}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Actual Value {g.uomType === 'ZERO' && '(set 0 if achieved)'}</label>
                    <input type="number" step="any" value={v.actual || ''} onChange={(e) => setValues((p) => ({ ...p, [g.id]: { ...v, actual: parseFloat(e.target.value) || 0 } }))}
                      className="input" placeholder="0" disabled={!windowOpen}/>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select value={v.status} onChange={(e) => setValues((p) => ({ ...p, [g.id]: { ...v, status: e.target.value as CheckInStatus } }))}
                      className="input" disabled={!windowOpen}>
                      <option value="NOT_STARTED">Not Started</option>
                      <option value="ON_TRACK">On Track</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                  {g.uomType === 'TIMELINE' && (
                    <div>
                      <label className="label">Completion Date</label>
                      <input type="date" value={v.completionDate || ''} onChange={(e) => setValues((p) => ({ ...p, [g.id]: { ...v, completionDate: e.target.value } }))}
                        className="input" disabled={!windowOpen}/>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end">
            <button onClick={() => submitMut.mutate()} disabled={!windowOpen || submitMut.isPending} className="btn-primary btn">
              {submitMut.isPending ? 'Submitting…' : `Submit ${activeQ} Check-ins`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
