import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { usersService, goalsService, checkinsService } from '@/services/services';
import { PageHeader, Spinner, ErrorState, StatusBadge, ProgressBar } from '@/components/common';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function TeamPage() {
  const user = useAuthStore((s) => s.user)!;
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const { data: team = [], isLoading, error, refetch } = useQuery({ queryKey: ['team', user.id], queryFn: () => usersService.getTeam(user.id) });
  const { data: teamGoals = [] } = useQuery({ queryKey: ['team-goals'], queryFn: goalsService.getTeam });

  const commentMut = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => checkinsService.addManagerComment(id, comment),
    onSuccess: () => { toast.success('Comment saved'); qc.invalidateQueries({ queryKey: ['team-goals'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;
  if (error) return <ErrorState onRetry={refetch}/>;

  const selectedUser = team.find((u) => u.id === selectedUserId);
  const userGoals = teamGoals.filter((g) => g.userId === selectedUserId);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="My Team" subtitle="View and manage your team members' goals"/>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Team list */}
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Members ({team.length})</p>
          </div>
          <div className="divide-y divide-surface-100 dark:divide-surface-800">
            {team.map((m) => {
              const mGoals = teamGoals.filter((g) => g.userId === m.id);
              const avg = mGoals.length ? mGoals.reduce((s, g) => s + (g.checkIns?.[0]?.progressScore ?? 0), 0) / mGoals.length : 0;
              return (
                <button key={m.id} onClick={() => setSelectedUserId(m.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors ${selectedUserId === m.id ? 'bg-brand-500/10 border-l-2 border-brand-500' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">{m.name.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{m.name}</p>
                      <p className="text-xs text-slate-400">{mGoals.length} goals · {avg.toFixed(0)}%</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="xl:col-span-3">
          {!selectedUser ? (
            <div className="card p-12 text-center text-slate-400 text-sm">Select a team member to view details</div>
          ) : (
            <div className="space-y-4">
              <div className="card p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-white text-xl font-bold">{selectedUser.name.charAt(0)}</div>
                <div>
                  <h2 className="font-bold text-slate-800 dark:text-white text-lg">{selectedUser.name}</h2>
                  <p className="text-sm text-slate-400">{selectedUser.email} · {selectedUser.department}</p>
                </div>
              </div>

              {userGoals.map((g) => (
                <div key={g.id} className="card p-0 overflow-hidden">
                  <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-800 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-white truncate">{g.title}</p>
                      <p className="text-xs text-slate-400">{g.thrustArea} · {g.weightage}%</p>
                    </div>
                    <StatusBadge status={g.status}/>
                  </div>
                  {g.checkIns && g.checkIns.length > 0 && (
                    <div className="p-4 space-y-3">
                      {g.checkIns.map((ci) => (
                        <div key={ci.id} className="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <StatusBadge status={ci.quarter}/>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={ci.status}/>
                              <span className="text-xs font-bold text-brand-400">{ci.progressScore.toFixed(0)}%</span>
                            </div>
                          </div>
                          <ProgressBar value={ci.progressScore} size="sm"/>
                          <p className="text-xs text-slate-500 mt-1.5">Actual: {ci.actualValue}</p>
                          {ci.managerComment ? (
                            <div className="mt-2 p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-xs text-slate-400">
                              <p className="font-semibold text-brand-300 mb-0.5">Your comment {ci.sentiment != null && (ci.sentiment > 0.05 ? '😊' : ci.sentiment < -0.05 ? '😟' : '😐')}</p>
                              {ci.managerComment}
                            </div>
                          ) : (
                            <div className="mt-2 flex gap-2">
                              <input placeholder="Add comment…" value={commentTexts[ci.id] || ''} onChange={(e) => setCommentTexts((p) => ({ ...p, [ci.id]: e.target.value }))}
                                className="input text-xs py-1.5 flex-1"/>
                              <button onClick={() => commentMut.mutate({ id: ci.id, comment: commentTexts[ci.id] || '' })} disabled={!commentTexts[ci.id] || commentMut.isPending}
                                className="btn-primary btn btn-sm">Save</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
