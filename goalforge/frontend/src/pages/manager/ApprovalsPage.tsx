import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, X, AlertTriangle } from 'lucide-react';
import { goalsService, aiService } from '@/services/services';
import { PageHeader, Spinner, ErrorState, EmptyState, StatusBadge, Modal } from '@/components/common';
import type { Goal, ConflictCheckResponse } from '@/types';

export default function ApprovalsPage() {
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [conflictResult, setConflictResult] = useState<ConflictCheckResponse | null>(null);
  const [conflictGoals, setConflictGoals] = useState<Goal[]>([]);
  const [conflictLoading, setConflictLoading] = useState(false);

  const { data: goals = [], isLoading, error, refetch } = useQuery({ queryKey: ['team-goals'], queryFn: goalsService.getTeam });
  const submitted = goals.filter((g) => g.status === 'SUBMITTED');

  // Group by user
  const byUser = submitted.reduce<Record<string, Goal[]>>((acc, g) => {
    const uid = g.userId;
    if (!acc[uid]) acc[uid] = [];
    acc[uid].push(g);
    return acc;
  }, {});

  const approveMut = useMutation({
    mutationFn: (id: string) => goalsService.approve(id),
    onSuccess: () => { toast.success('Goal approved'); qc.invalidateQueries({ queryKey: ['team-goals'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => goalsService.reject(id, comment),
    onSuccess: () => { toast.success('Goal returned for rework'); qc.invalidateQueries({ queryKey: ['team-goals'] }); setRejectId(null); setRejectComment(''); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });

  const checkConflicts = async (userGoals: Goal[]) => {
    setConflictLoading(true);
    setConflictGoals(userGoals);
    try {
      const result = await aiService.conflictCheck(userGoals);
      setConflictResult(result);
    } catch { toast.error('Conflict check unavailable'); }
    finally { setConflictLoading(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;
  if (error) return <ErrorState onRetry={refetch}/>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Goal Approvals" subtitle={`${submitted.length} goal sheet(s) awaiting review`}/>

      {Object.keys(byUser).length === 0 ? (
        <EmptyState title="All caught up!" description="No goal sheets awaiting approval."/>
      ) : (
        Object.entries(byUser).map(([uid, userGoals]) => {
          const emp = userGoals[0].user;
          const totalWeight = userGoals.reduce((s, g) => s + g.weightage, 0);
          const weightOk = Math.abs(totalWeight - 100) < 0.01;
          return (
            <div key={uid} className="card p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-800 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold">{emp?.name.charAt(0)}</div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 dark:text-white">{emp?.name}</p>
                  <p className="text-xs text-slate-400">{emp?.department} · {userGoals.length} goals · Total weight: <span className={weightOk ? 'text-success-400' : 'text-danger-400 font-bold'}>{totalWeight}%</span></p>
                </div>
                <button onClick={() => checkConflicts(userGoals)} disabled={conflictLoading}
                  className="btn-secondary btn btn-sm gap-1.5">
                  {conflictLoading ? <Spinner size={12}/> : <AlertTriangle size={13}/>} Check Conflicts
                </button>
              </div>

              <div className="table-container rounded-none border-0">
                <table className="data-table">
                  <thead><tr><th>Goal</th><th>Thrust Area</th><th>UoM</th><th>Target</th><th>Weight</th><th>Actions</th></tr></thead>
                  <tbody>
                    {userGoals.map((g) => (
                      <tr key={g.id}>
                        <td><p className="font-medium text-slate-800 dark:text-white max-w-[200px] truncate">{g.title}</p></td>
                        <td><span className="text-xs text-slate-500">{g.thrustArea}</span></td>
                        <td><StatusBadge status={g.uomType}/></td>
                        <td><span className="font-semibold">{g.target}</span></td>
                        <td><span className="font-semibold">{g.weightage}%</span></td>
                        <td>
                          <div className="flex gap-1">
                            <button onClick={() => approveMut.mutate(g.id)} disabled={approveMut.isPending}
                              className="p-1.5 rounded-lg bg-success-500/10 text-success-500 hover:bg-success-500/20 transition-all"><Check size={14}/></button>
                            <button onClick={() => setRejectId(g.id)}
                              className="p-1.5 rounded-lg bg-danger-500/10 text-danger-500 hover:bg-danger-500/20 transition-all"><X size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* Reject modal */}
      <Modal open={!!rejectId} onClose={() => { setRejectId(null); setRejectComment(''); }} title="Return for Rework"
        footer={<>
          <button className="btn-secondary btn btn-sm" onClick={() => setRejectId(null)}>Cancel</button>
          <button className="btn-danger btn btn-sm" disabled={!rejectComment.trim() || rejectMut.isPending}
            onClick={() => rejectMut.mutate({ id: rejectId!, comment: rejectComment })}>
            {rejectMut.isPending ? 'Returning…' : 'Return for Rework'}
          </button>
        </>}>
        <div>
          <label className="label">Comment (required)</label>
          <textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} rows={4} className="input resize-none" placeholder="Explain why you are returning this goal…"/>
        </div>
      </Modal>

      {/* Conflict result modal */}
      <Modal open={!!conflictResult} onClose={() => setConflictResult(null)} title="AI Conflict Analysis" size="lg">
        {conflictResult?.conflicts.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-12 h-12 rounded-full bg-success-500/10 flex items-center justify-center"><Check size={24} className="text-success-500"/></div>
            <p className="font-semibold text-slate-800 dark:text-white">No conflicts detected</p>
            <p className="text-sm text-slate-400">All goals appear complementary and aligned.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conflictResult?.conflicts.map((c, i) => (
              <div key={i} className={`p-4 rounded-xl border ${c.severity === 'HIGH' ? 'border-danger-500/30 bg-danger-500/10' : c.severity === 'MEDIUM' ? 'border-warning-500/30 bg-warning-500/10' : 'border-slate-500/30 bg-slate-500/10'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${c.severity === 'HIGH' ? 'badge-rejected' : c.severity === 'MEDIUM' ? 'bg-warning-500/10 text-warning-600' : 'badge-draft'}`}>{c.severity}</span>
                  <p className="text-xs text-slate-500">Goal {c.goal1Index + 1} vs Goal {c.goal2Index + 1}</p>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200">{c.reason}</p>
                <div className="mt-2 text-xs text-slate-400">
                  <span className="font-semibold">Goal {c.goal1Index + 1}:</span> {conflictGoals[c.goal1Index]?.title}<br/>
                  <span className="font-semibold">Goal {c.goal2Index + 1}:</span> {conflictGoals[c.goal2Index]?.title}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
