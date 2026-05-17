import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { usersService, goalsService, checkinsService, kudosService, aiService } from '@/services/services';
import { PageHeader, Spinner, ErrorState, StatusBadge, ProgressBar } from '@/components/common';
import toast from 'react-hot-toast';
import type { KudosBadgeType, PerformanceReviewDraftResponse } from '@/types';

const BADGES: KudosBadgeType[] = ['COLLABORATOR', 'PROBLEM_SOLVER', 'INNOVATION_SPARK', 'CUSTOMER_CHAMPION', 'EXECUTION_ACE'];

export default function TeamPage() {
  const user = useAuthStore((s) => s.user);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [kudosForms, setKudosForms] = useState<Record<string, { badgeType: KudosBadgeType; note: string }>>({});
  const [reviewDraft, setReviewDraft] = useState<PerformanceReviewDraftResponse | null>(null);
  const qc = useQueryClient();

  const { data: team = [], isLoading, error, refetch } = useQuery({
    queryKey: ['team', user?.id],
    queryFn: () => usersService.getTeam(user?.id ?? ''),
    enabled: !!user?.id
  });
  const { data: teamGoals = [] } = useQuery({ queryKey: ['team-goals'], queryFn: goalsService.getTeam });

  const commentMut = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => checkinsService.addManagerComment(id, comment),
    onSuccess: () => {
      toast.success('Comment saved');
      qc.invalidateQueries({ queryKey: ['team-goals'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed')
  });

  const kudosMut = useMutation({
    mutationFn: ({ receiverId, goalId, badgeType, note }: { receiverId: string; goalId?: string; badgeType: KudosBadgeType; note: string }) =>
      kudosService.create({ receiverId, goalId, badgeType, note }),
    onSuccess: () => {
      toast.success('Kudos sent');
      qc.invalidateQueries({ queryKey: ['team-goals'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed to send kudos')
  });

  const reviewMut = useMutation({
    mutationFn: (employeeId: string) => aiService.performanceReview(employeeId),
    onSuccess: (result) => {
      setReviewDraft(result);
      toast.success('Performance review draft generated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed to draft performance review')
  });

  if (!user || isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;
  if (error) return <ErrorState onRetry={refetch} />;

  const selectedUser = team.find((member) => member.id === selectedUserId);
  const userGoals = teamGoals.filter((goal) => goal.userId === selectedUserId);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="My Team" subtitle="Coach goals, send kudos, and generate review drafts from real performance evidence" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="card overflow-hidden p-0">
          <div className="border-b border-surface-100 px-4 py-3 dark:border-surface-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Members ({team.length})</p>
          </div>
          <div className="divide-y divide-surface-100 dark:divide-surface-800">
            {team.map((member) => {
              const memberGoals = teamGoals.filter((goal) => goal.userId === member.id);
              const avg = memberGoals.length
                ? memberGoals.reduce((sum, goal) => sum + (goal.checkIns?.[0]?.progressScore ?? 0), 0) / memberGoals.length
                : 0;
              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedUserId(member.id)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-800 ${
                    selectedUserId === member.id ? 'border-l-2 border-brand-500 bg-brand-500/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{member.name.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{member.name}</p>
                      <p className="text-xs text-slate-400">{memberGoals.length} goals · {avg.toFixed(0)}%</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-3">
          {!selectedUser ? (
            <div className="card p-12 text-center text-sm text-slate-400">Select a team member to view details</div>
          ) : (
            <div className="space-y-4">
              <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">{selectedUser.name.charAt(0)}</div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">{selectedUser.name}</h2>
                  <p className="text-sm text-slate-400">{selectedUser.email} · {selectedUser.department}</p>
                </div>
                <button onClick={() => reviewMut.mutate(selectedUser.id)} disabled={reviewMut.isPending} className="btn btn-primary w-full sm:ml-auto sm:w-auto">
                  {reviewMut.isPending ? 'Drafting...' : 'Auto-Draft Review'}
                </button>
              </div>

              {reviewDraft?.employee.id === selectedUser.id ? (
                <div className="card p-5">
                  <h3 className="font-semibold text-slate-800 dark:text-white">Generated Performance Review</h3>
                  <p className="mt-1 text-xs text-slate-400">Synthesized from check-ins, progress metrics, manager notes, and kudos.</p>
                  <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-surface-50 p-4 text-sm leading-7 text-slate-700 dark:bg-surface-900/60 dark:text-slate-200">
                    {reviewDraft.draft}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {reviewDraft.highlights.map((highlight) => (
                      <span key={highlight} className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-300">
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {userGoals.map((goal) => (
                <div key={goal.id} className="card overflow-hidden p-0">
                  <div className="flex items-center gap-3 border-b border-surface-100 px-5 py-4 dark:border-surface-800">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-800 dark:text-white">{goal.title}</p>
                      <p className="text-xs text-slate-400">{goal.thrustArea} · {goal.weightage}% · {goal.sensitivity || 'NORMAL'}</p>
                    </div>
                    <StatusBadge status={goal.status} />
                  </div>

                  <div className="border-b border-surface-100 bg-surface-50 px-5 py-4 dark:border-surface-800 dark:bg-surface-900/40">
                    <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[180px,1fr,auto]">
                      <div>
                        <label className="label">Badge</label>
                        <select
                          value={kudosForms[goal.id]?.badgeType || 'COLLABORATOR'}
                          onChange={(e) => setKudosForms((prev) => ({ ...prev, [goal.id]: { badgeType: e.target.value as KudosBadgeType, note: prev[goal.id]?.note || '' } }))}
                          className="input"
                        >
                          {BADGES.map((badge) => <option key={badge}>{badge}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Peer Kudos Note</label>
                        <input
                          value={kudosForms[goal.id]?.note || ''}
                          onChange={(e) => setKudosForms((prev) => ({ ...prev, [goal.id]: { badgeType: prev[goal.id]?.badgeType || 'COLLABORATOR', note: e.target.value } }))}
                          className="input"
                          placeholder="Recognize a teammate's impact on this goal..."
                        />
                      </div>
                      <button
                        onClick={() =>
                          kudosMut.mutate({
                            receiverId: goal.userId,
                            goalId: goal.id,
                            badgeType: kudosForms[goal.id]?.badgeType || 'COLLABORATOR',
                            note: kudosForms[goal.id]?.note || ''
                          })
                        }
                        disabled={!kudosForms[goal.id]?.note || kudosMut.isPending}
                        className="btn btn-primary w-full md:w-auto"
                      >
                        Send Kudos
                      </button>
                    </div>
                  </div>

                  {goal.checkIns && goal.checkIns.length > 0 ? (
                    <div className="space-y-3 p-4">
                      {goal.checkIns.map((checkIn) => (
                        <div key={checkIn.id} className="rounded-xl bg-surface-50 p-3 dark:bg-surface-800">
                          <div className="mb-2 flex items-center justify-between">
                            <StatusBadge status={checkIn.quarter} />
                            <div className="flex items-center gap-2">
                              <StatusBadge status={checkIn.status} />
                              <span className="text-xs font-bold text-brand-400">{checkIn.progressScore.toFixed(0)}%</span>
                            </div>
                          </div>
                          <ProgressBar value={checkIn.progressScore} size="sm" />
                          <p className="mt-1.5 text-xs text-slate-500">Actual: {checkIn.actualValue}</p>
                          {checkIn.employeeNote ? <p className="mt-1.5 text-xs text-slate-500">Employee note: {checkIn.employeeNote}</p> : null}
                          {checkIn.managerComment ? (
                            <div className="mt-2 rounded-lg border border-brand-500/20 bg-brand-500/10 p-2 text-xs text-slate-400">
                              <p className="mb-0.5 font-semibold text-brand-300">Your comment</p>
                              {checkIn.managerComment}
                            </div>
                          ) : (
                            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                              <input
                                placeholder="Add comment..."
                                value={commentTexts[checkIn.id] || ''}
                                onChange={(e) => setCommentTexts((prev) => ({ ...prev, [checkIn.id]: e.target.value }))}
                                className="input flex-1 py-1.5 text-xs"
                              />
                              <button
                                onClick={() => commentMut.mutate({ id: checkIn.id, comment: commentTexts[checkIn.id] || '' })}
                                disabled={!commentTexts[checkIn.id] || commentMut.isPending}
                                className="btn btn-primary btn-sm w-full sm:w-auto"
                              >
                                Save
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
