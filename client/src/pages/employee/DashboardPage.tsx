import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import {
  goalsService,
  cyclesService,
  mlService,
  kudosService,
  integrationsService,
} from '@/services/services';
import {
  StatCard,
  PageHeader,
  Spinner,
  ErrorState,
  StatusBadge,
  ProgressBar,
  EmptyState,
} from '@/components/common';
import {
  Target,
  CheckSquare,
  TrendingUp,
  AlertCircle,
  Plus,
  ClipboardCheck,
  Bot,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function EmployeeDashboard() {
  const user = useAuthStore((s) => s.user);
  const [command, setCommand] = useState('Update my prototype goal to 3');
  const [platform, setPlatform] = useState<'teams' | 'slack'>('teams');

  const { data: goals = [], isLoading, error, refetch } = useQuery({
    queryKey: ['my-goals'],
    queryFn: goalsService.getMine,
  });
  const { data: cycleStatus } = useQuery({
    queryKey: ['cycle-status'],
    queryFn: async () => {
      const cycle = await cyclesService.getActive();
      if (!cycle) return null;
      return cyclesService.getStatus(cycle.id);
    },
  });
  const { data: predictions = [] } = useQuery({
    queryKey: ['ml-predictions', user?.id],
    queryFn: async () => {
      const cycle = await cyclesService.getActive();
      if (!cycle) return [];
      return mlService.predictAchievement(user?.id ?? '', cycle.id);
    },
  });
  const { data: anomalies = [] } = useQuery({
    queryKey: ['anomalies'],
    queryFn: mlService.getAnomalies,
  });
  const { data: kudos = [] } = useQuery({
    queryKey: ['my-kudos', user?.id],
    queryFn: () => kudosService.getAll(user?.id),
    enabled: !!user?.id,
  });
  const myAnomaly = anomalies.find((a) => a.userId === user?.id && a.isAnomaly);
  const chatopsMut = useMutation({
    mutationFn: () => integrationsService.chatopsCommand(platform, command),
    onError: (apiError: any) =>
      toast.error(apiError?.response?.data?.error?.message ?? 'Bot could not process that command'),
  });

  if (!user || isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }
  if (error) return <ErrorState onRetry={refetch} />;

  const approved = goals.filter((g) => ['APPROVED', 'LOCKED'].includes(g.status)).length;
  const avgProg = goals.length
    ? goals.reduce((sum, goal) => sum + (goal.checkIns?.[0]?.progressScore ?? 0), 0) / goals.length
    : 0;
  const pending = goals.filter((g) => ['DRAFT', 'REJECTED'].includes(g.status)).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Good day, ${user?.name?.split(' ')[0] ?? 'User'}!`}
        subtitle="Your goal health overview"
        actions={
          <Link to="/employee/goals/new" className="btn-primary btn w-full gap-2 sm:w-auto">
            <Plus size={16} />
            Add Goal
          </Link>
        }
      />

      {user.jobTitle && (
        <div className="rounded-2xl border border-surface-200 bg-surface-100 px-4 py-3 dark:border-surface-800 dark:bg-surface-900/70 sm:px-5">
          <p className="text-sm text-slate-500">Role profile</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">{user.jobTitle}</p>
        </div>
      )}

      {cycleStatus?.activeQuarter && (
        <div className="mobile-stack rounded-2xl border border-brand-500/30 bg-brand-600/10 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
            <p className="text-sm font-medium text-brand-300">
              <span className="font-bold text-brand-200">
                {cycleStatus.activeQuarter} check-in window is open
              </span>
              {cycleStatus.daysRemaining != null ? ` - ${cycleStatus.daysRemaining} days remaining` : ''}
            </p>
          </div>
          <Link to="/employee/checkin" className="btn-primary btn btn-sm w-full sm:w-auto">
            <ClipboardCheck size={13} />
            Submit
          </Link>
        </div>
      )}

      {myAnomaly && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning-500/30 bg-warning-500/10 px-4 py-3 sm:px-5">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-warning-400" />
          <p className="text-sm text-warning-300">
            <span className="font-semibold">Review your reporting patterns.</span> {myAnomaly.reason}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Goals" value={goals.length} icon={<Target size={18} />} color="brand" />
        <StatCard title="Approved" value={approved} icon={<CheckSquare size={18} />} color="success" />
        <StatCard
          title="Avg Progress"
          value={`${avgProg.toFixed(0)}%`}
          icon={<TrendingUp size={18} />}
          color="warning"
        />
        <StatCard
          title="Pending Actions"
          value={pending}
          icon={<AlertCircle size={18} />}
          color="danger"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card overflow-hidden p-0 xl:col-span-2">
          <div className="flex items-center justify-between border-b border-surface-100 px-4 py-4 dark:border-surface-800 sm:px-5">
            <h2 className="font-semibold text-slate-800 dark:text-white">My Goals</h2>
            <Link to="/employee/goals" className="text-xs font-medium text-brand-500">
              View all
            </Link>
          </div>
          {goals.length === 0 ? (
            <EmptyState
              title="No goals yet"
              description="Add your first goal."
              action={
                <Link to="/employee/goals/new" className="btn-primary btn btn-sm">
                  Add Goal
                </Link>
              }
            />
          ) : (
            <>
              <div className="hidden md:block">
                <div className="table-container rounded-none border-0">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Goal</th>
                        <th>Thrust Area</th>
                        <th>Weight</th>
                        <th>Status</th>
                        <th>Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {goals.slice(0, 6).map((goal) => {
                        const latest = goal.checkIns?.[0];
                        return (
                          <tr key={goal.id}>
                            <td>
                              <p className="max-w-[200px] truncate font-medium text-slate-800 dark:text-white">
                                {goal.title}
                              </p>
                              <p className="text-xs text-slate-400">
                                {goal.uomType} - Target: {goal.target}
                              </p>
                            </td>
                            <td><span className="text-xs text-slate-500">{goal.thrustArea}</span></td>
                            <td><span className="font-semibold">{goal.weightage}%</span></td>
                            <td><StatusBadge status={goal.status} /></td>
                            <td className="w-32">
                              {latest ? (
                                <ProgressBar value={latest.progressScore} showLabel size="sm" />
                              ) : (
                                <span className="text-xs text-slate-400">No check-in</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="divide-y divide-surface-100 dark:divide-surface-800 md:hidden">
                {goals.slice(0, 6).map((goal) => {
                  const latest = goal.checkIns?.[0];
                  return (
                    <div key={goal.id} className="px-4 py-4 sm:px-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 dark:text-white">{goal.title}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {goal.thrustArea} - {goal.uomType} - Target: {goal.target}
                          </p>
                        </div>
                        <StatusBadge status={goal.status} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span className="font-semibold">{goal.weightage}% weight</span>
                        <span>{latest ? `${latest.progressScore.toFixed(0)}% progress` : 'No check-in yet'}</span>
                      </div>
                      <div className="mt-2">
                        {latest ? (
                          <ProgressBar value={latest.progressScore} showLabel size="sm" />
                        ) : (
                          <span className="text-xs text-slate-400">No check-in</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="card overflow-hidden p-0">
          <div className="border-b border-surface-100 px-4 py-4 dark:border-surface-800 sm:px-5">
            <h2 className="font-semibold text-slate-800 dark:text-white">ML Q4 Predictions</h2>
            <p className="mt-0.5 text-xs text-slate-400">Predicted end-of-year scores</p>
          </div>
          <div className="space-y-4 p-4">
            {predictions.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No predictions yet</p>
            ) : (
              predictions.slice(0, 5).map((pred) => (
                <div key={pred.goalId}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                      {pred.goalTitle}
                    </p>
                    <span className="text-xs font-bold text-brand-400">
                      {pred.predictedScore.toFixed(0)}%
                    </span>
                  </div>
                  <ProgressBar value={pred.predictedScore} size="sm" />
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    CI: [{pred.confidenceInterval[0].toFixed(0)}-{pred.confidenceInterval[1].toFixed(0)}%]
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
              <Bot size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">ChatOps Bot</h2>
              <p className="text-xs text-slate-400">
                Update goals from Teams or Slack using natural language.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[140px,1fr]">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as 'teams' | 'slack')}
              className="input"
            >
              <option value="teams">MS Teams</option>
              <option value="slack">Slack</option>
            </select>
            <input value={command} onChange={(e) => setCommand(e.target.value)} className="input" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="rounded-full bg-surface-800 px-2 py-1">Update my sales goal to 10000</span>
            <span className="rounded-full bg-surface-800 px-2 py-1">Log progress on close tickets to 42</span>
            <span className="rounded-full bg-surface-800 px-2 py-1">Mark my dashboard goal completed</span>
          </div>
          <button
            onClick={() => chatopsMut.mutate()}
            disabled={chatopsMut.isPending}
            className="btn btn-primary mt-4 w-full sm:w-auto"
          >
            {chatopsMut.isPending ? 'Updating...' : 'Send Command'}
          </button>
          {chatopsMut.data ? (
            <div className="mt-4 rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4">
              <p className="text-sm font-semibold text-brand-300">Bot Reply</p>
              <p className="mt-2 text-sm text-slate-200">{chatopsMut.data.message}</p>
            </div>
          ) : null}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-white">Why Managers Love It</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-400">
            <p>
              Employees can update targets, log actual progress, and mark work complete without
              opening the full app.
            </p>
            <p>
              The bot still writes through the same audit-friendly goal and check-in model, so
              nothing becomes a side channel.
            </p>
            <p>
              That makes Teams and Slack feel like first-class operating surfaces instead of just
              notification destinations.
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-surface-100 px-4 py-4 dark:border-surface-800 sm:px-5">
          <h2 className="font-semibold text-slate-800 dark:text-white">Peer Kudos</h2>
          <p className="mt-0.5 text-xs text-slate-400">Recent recognition linked to your work</p>
        </div>
        <div className="divide-y divide-surface-100 dark:divide-surface-800">
          {kudos.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No kudos yet. Keep building momentum.</p>
          ) : (
            kudos.slice(0, 5).map((item) => (
              <div key={item.id} className="px-4 py-4 sm:px-5">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    {item.badgeType.replace(/_/g, ' ')}
                  </p>
                  <span className="text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mb-1 text-xs text-slate-500">
                  From {item.sender?.name ?? 'A teammate'}
                  {item.goal?.title ? ` - ${item.goal.title}` : ''}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{item.note}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
