import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, X, AlertTriangle, Edit2 } from 'lucide-react';
import { goalsService, aiService, integrationsService } from '@/services/services';
import { PageHeader, Spinner, ErrorState, EmptyState, StatusBadge, Modal } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import type { Goal, ConflictCheckResponse, Notification } from '@/types';

type InlineEdit = { target?: number; weightage?: number };

export default function ApprovalsPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [conflictResult, setConflictResult] = useState<ConflictCheckResponse | null>(null);
  const [conflictGoals, setConflictGoals] = useState<Goal[]>([]);
  const [conflictLoading, setConflictLoading] = useState(false);

  // Inline edits: keyed by goalId
  const [inlineEdits, setInlineEdits] = useState<Record<string, InlineEdit>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: goals = [], isLoading, error, refetch } = useQuery({ queryKey: ['team-goals'], queryFn: goalsService.getTeam });
  const { data: teamCards = [] } = useQuery({
    queryKey: ['teams-cards', user?.id],
    queryFn: () => integrationsService.getTeamsCards(user?.id ?? ''),
    enabled: !!user?.id,
  });
  const submitted = goals.filter((g) => g.status === 'SUBMITTED');

  const byUser = submitted.reduce<Record<string, Goal[]>>((acc, g) => {
    const uid = g.userId;
    if (!acc[uid]) acc[uid] = [];
    acc[uid].push(g);
    return acc;
  }, {});

  const approveMut = useMutation({
    mutationFn: ({ id, edits }: { id: string; edits?: InlineEdit }) =>
      goalsService.approve(id, edits),
    onSuccess: () => {
      toast.success('Goal approved');
      qc.invalidateQueries({ queryKey: ['team-goals'] });
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => goalsService.reject(id, comment),
    onSuccess: () => {
      toast.success('Goal returned for rework');
      qc.invalidateQueries({ queryKey: ['team-goals'] });
      setRejectId(null);
      setRejectComment('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });

  const teamsActionMut = useMutation({
    mutationFn: ({ decision, token }: { decision: 'approve' | 'reject'; token: string }) =>
      integrationsService.submitTeamsAction(decision, token, decision === 'reject' ? 'Returned from Teams preview' : 'Approved from Teams preview'),
    onSuccess: () => {
      toast.success('Teams action applied');
      qc.invalidateQueries({ queryKey: ['team-goals'] });
      qc.invalidateQueries({ queryKey: ['teams-cards'] });
    },
    onError: () => toast.error('Teams action failed'),
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
          const totalWeight = userGoals.reduce((s, g) => {
            const edit = inlineEdits[g.id];
            return s + (edit?.weightage ?? g.weightage);
          }, 0);
          const weightOk = Math.abs(totalWeight - 100) < 0.01;
          return (
            <div key={uid} className="card p-0 overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-surface-100 px-4 py-4 dark:border-surface-800 sm:flex-row sm:items-center sm:px-5">
                <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold">{emp?.name.charAt(0)}</div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 dark:text-white">{emp?.name}</p>
                  <p className="text-xs text-slate-400">{emp?.department} · {userGoals.length} goals · Total weight: <span className={weightOk ? 'text-success-400' : 'text-danger-400 font-bold'}>{totalWeight.toFixed(0)}%</span></p>
                </div>
                {userGoals.some((goal) => (goal as any).conflictAlertsA?.length || (goal as any).conflictAlertsB?.length) && (
                  <span className="badge badge-rejected">Open conflict</span>
                )}
                <button onClick={() => checkConflicts(userGoals)} disabled={conflictLoading}
                  className="btn-secondary btn btn-sm w-full gap-1.5 sm:w-auto">
                  {conflictLoading ? <Spinner size={12}/> : <AlertTriangle size={13}/>} Check Conflicts
                </button>
              </div>

              <div className="table-container rounded-none border-0">
                <table className="data-table">
                  <thead><tr><th>Goal</th><th>Thrust Area</th><th>UoM</th><th>Target</th><th>Weight</th><th>Actions</th></tr></thead>
                  <tbody>
                    {userGoals.map((g) => {
                      const isEditing = editingId === g.id;
                      const edit = inlineEdits[g.id] ?? {};
                      return (
                        <tr key={g.id}>
                          <td><p className="font-medium text-slate-800 dark:text-white max-w-[200px] truncate">{g.title}</p></td>
                          <td><span className="text-xs text-slate-500">{g.thrustArea}</span></td>
                          <td><StatusBadge status={g.uomType}/></td>
                          <td>
                            {isEditing ? (
                              <input
                                type="number"
                                className="input w-24 py-1 text-sm"
                                value={edit.target ?? g.target}
                                onChange={(e) => setInlineEdits((p) => ({ ...p, [g.id]: { ...p[g.id], target: parseFloat(e.target.value) || 0 } }))}
                                step="any"
                                min={0}
                              />
                            ) : (
                              <span className="font-semibold">{edit.target ?? g.target}</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="number"
                                className="input w-20 py-1 text-sm"
                                value={edit.weightage ?? g.weightage}
                                onChange={(e) => setInlineEdits((p) => ({ ...p, [g.id]: { ...p[g.id], weightage: parseFloat(e.target.value) || 0 } }))}
                                min={10}
                                max={100}
                              />
                            ) : (
                              <span className="font-semibold">{(edit.weightage ?? g.weightage)}%</span>
                            )}
                          </td>
                          <td>
                            <div className="flex gap-1 items-center">
                              {/* Toggle inline edit mode */}
                              <button
                                onClick={() => setEditingId(isEditing ? null : g.id)}
                                title={isEditing ? 'Cancel edit' : 'Edit target / weight'}
                                className={`p-1.5 rounded-lg transition-all ${isEditing ? 'bg-warning-500/20 text-warning-400' : 'bg-surface-100 dark:bg-surface-800 text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                              >
                                <Edit2 size={13}/>
                              </button>
                              <button
                                onClick={() => approveMut.mutate({ id: g.id, edits: Object.keys(inlineEdits[g.id] ?? {}).length ? inlineEdits[g.id] : undefined })}
                                disabled={approveMut.isPending}
                                title="Approve goal"
                                className="p-1.5 rounded-lg bg-success-500/10 text-success-500 hover:bg-success-500/20 transition-all">
                                <Check size={14}/>
                              </button>
                              <button
                                onClick={() => setRejectId(g.id)}
                                title="Return for rework"
                                className="p-1.5 rounded-lg bg-danger-500/10 text-danger-500 hover:bg-danger-500/20 transition-all">
                                <X size={14}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!weightOk && (
                <div className="px-5 py-2 bg-warning-500/10 border-t border-warning-500/20">
                  <p className="text-xs text-warning-400">⚠ Total weightage is {totalWeight.toFixed(0)}%. Adjust individual weights so they sum to exactly 100% before approving.</p>
                </div>
              )}
            </div>
          );
        })
      )}

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-800">
          <h2 className="font-semibold text-slate-800 dark:text-white">Teams Approval Preview</h2>
          <p className="text-xs text-slate-400 mt-0.5">These cards use the same signed callback flow as the Microsoft demo integration.</p>
        </div>
        <div className="divide-y divide-surface-100 dark:divide-surface-800">
          {teamCards.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No Teams approval cards yet.</p>
          ) : (
            teamCards.slice(0, 3).map((card: Notification) => {
              const adaptiveCard = card.metadata?.adaptiveCard as { actions?: Array<{ title: string; data?: { token?: string } }> } | undefined;
              const approveToken = adaptiveCard?.actions?.find((action) => action.title === 'Approve')?.data?.token;
              const rejectToken = adaptiveCard?.actions?.find((action) => action.title === 'Reject')?.data?.token;
              return (
                <div key={card.id} className="px-4 py-4 sm:px-5">
                  <p className="font-semibold text-slate-800 dark:text-white mb-1">{card.title}</p>
                  <p className="text-sm text-slate-500 mb-3">{card.message}</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => approveToken && teamsActionMut.mutate({ decision: 'approve', token: approveToken })}
                      disabled={!approveToken || teamsActionMut.isPending}
                      className="btn-primary btn btn-sm w-full sm:w-auto"
                    >
                      Approve From Teams
                    </button>
                    <button
                      onClick={() => rejectToken && teamsActionMut.mutate({ decision: 'reject', token: rejectToken })}
                      disabled={!rejectToken || teamsActionMut.isPending}
                      className="btn-secondary btn btn-sm w-full sm:w-auto"
                    >
                      Reject From Teams
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

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
