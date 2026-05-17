import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { goalsService, usersService, mlService, integrationsService } from '@/services/services';
import { StatCard, PageHeader, Spinner, ErrorState, StatusBadge, ProgressBar } from '@/components/common';
import { Users, ClipboardCheck, TrendingUp, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ManagerDashboard() {
  const user = useAuthStore((s) => s.user);

  const { data: team = [], isLoading: teamLoading } = useQuery({
    queryKey: ['team', user?.id],
    queryFn: () => usersService.getTeam(user?.id ?? ''),
    enabled: !!user?.id
  });
  const { data: teamGoals = [], isLoading: goalsLoading, error, refetch } = useQuery({ queryKey: ['team-goals'], queryFn: goalsService.getTeam });
  const { data: anomalies = [] } = useQuery({ queryKey: ['anomalies'], queryFn: mlService.getAnomalies });
  const { data: teamSentiment } = useQuery({
    queryKey: ['team-sentiment', user?.id],
    queryFn: () => mlService.getTeamSentiment(user?.id),
    enabled: !!user?.id
  });
  const { data: flightRisk } = useQuery({
    queryKey: ['flight-risk', user?.id],
    queryFn: () => mlService.getFlightRisk(user?.id),
    enabled: !!user?.id
  });
  const { data: teamCards = [] } = useQuery({
    queryKey: ['teams-cards', user?.id],
    queryFn: () => integrationsService.getTeamsCards(user?.id ?? ''),
    enabled: !!user?.id
  });

  if (!user || teamLoading || goalsLoading) return <div className="flex h-64 items-center justify-center"><Spinner size={32} /></div>;
  if (error) return <ErrorState onRetry={refetch} />;

  const pending = teamGoals.filter((goal) => goal.status === 'SUBMITTED').length;
  const teamAnomalies = anomalies.filter((item) => team.some((member) => member.id === item.userId) && item.isAnomaly);
  const avgProgress = teamGoals.length ? teamGoals.reduce((sum, goal) => sum + (goal.checkIns?.[0]?.progressScore ?? 0), 0) / teamGoals.length : 0;
  const topRisk = flightRisk?.employees.slice(0, 3) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Manager Dashboard" subtitle="Team overview, retention risk, and pending actions" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Team Size" value={team.length} icon={<Users size={18} />} color="brand" />
        <StatCard title="Pending Approvals" value={pending} icon={<ClipboardCheck size={18} />} color="warning" />
        <StatCard title="Team Avg Progress" value={`${avgProgress.toFixed(0)}%`} icon={<TrendingUp size={18} />} color="success" />
        <StatCard title="At-Risk Employees" value={flightRisk?.summary.high ?? 0} icon={<AlertTriangle size={18} />} color="danger" />
      </div>

      {teamSentiment ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="card p-4">
            <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Team Sentiment</p>
            <p className={`text-3xl font-display font-bold ${teamSentiment.latestAverage <= -0.15 ? 'text-danger-400' : teamSentiment.latestAverage < 0.1 ? 'text-warning-400' : 'text-success-400'}`}>
              {teamSentiment.latestAverage.toFixed(2)}
            </p>
          </div>
          <div className="card p-4">
            <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Engagement Score</p>
            <p className="text-3xl font-display font-bold text-brand-400">{teamSentiment.engagementScore.toFixed(0)}%</p>
          </div>
          <div className="card p-4">
            <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Flight Risk Mix</p>
            <p className="text-lg font-semibold text-white">High {flightRisk?.summary.high ?? 0} · Medium {flightRisk?.summary.medium ?? 0} · Low {flightRisk?.summary.low ?? 0}</p>
          </div>
        </div>
      ) : null}

      {teamSentiment?.alertFlags?.length ? (
        <div className="rounded-2xl border border-danger-500/20 bg-danger-500/10 px-5 py-4">
          <p className="mb-1 text-sm font-semibold text-danger-300">Burnout watchlist</p>
          {teamSentiment.alertFlags.map((flag) => (
            <p key={flag} className="text-sm text-danger-200">{flag}</p>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-surface-100 px-5 py-4 dark:border-surface-800">
            <h2 className="font-semibold text-slate-800 dark:text-white">Flight Risk Predictor</h2>
            <Link to="/manager/analytics" className="text-xs font-medium text-brand-500">Open analytics</Link>
          </div>
          <div className="space-y-3 p-4">
            {topRisk.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No flight-risk data available yet.</p>
            ) : (
              topRisk.map((person) => (
                <div key={person.userId} className="rounded-2xl border border-surface-100 p-4 dark:border-surface-800">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">{person.userName}</p>
                      <p className="text-xs text-slate-400">{person.jobTitle} · {person.department}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${person.riskLevel === 'HIGH' ? 'bg-danger-500/15 text-danger-300' : person.riskLevel === 'MEDIUM' ? 'bg-warning-500/15 text-warning-300' : 'bg-success-500/15 text-success-300'}`}>
                      {person.riskLevel} · {person.riskScore}
                    </span>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={person.riskScore} size="sm" />
                  </div>
                  <p className="mt-3 text-xs text-slate-400">{person.reasons[0]}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-surface-100 px-5 py-4 dark:border-surface-800">
            <h2 className="font-semibold text-slate-800 dark:text-white">Pending Approvals</h2>
            <Link to="/manager/approvals" className="text-xs font-medium text-brand-500">View all</Link>
          </div>
          {pending === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No pending approvals</p>
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {teamGoals.filter((goal) => goal.status === 'SUBMITTED').slice(0, 5).map((goal) => (
                <div key={goal.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{goal.title}</p>
                    <p className="text-xs text-slate-400">{goal.user?.name} · {goal.weightage}%</p>
                  </div>
                  <StatusBadge status={goal.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {teamAnomalies.length > 0 ? (
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-800 dark:text-white">
            <AlertTriangle size={16} className="text-danger-400" /> Anomaly Alerts
          </h2>
          <div className="space-y-2">
            {teamAnomalies.map((item) => (
              <div key={item.userId} className="flex items-center gap-3 rounded-xl border border-danger-500/20 bg-danger-500/10 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-500/20 text-sm font-bold text-danger-400">{item.userName?.charAt(0) ?? '?'}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{item.userName}</p>
                  <p className="text-xs text-slate-400">{item.reason}</p>
                </div>
                <span className="ml-auto text-xs font-bold text-danger-400">Score: {item.anomalyScore.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card overflow-hidden p-0">
        <div className="border-b border-surface-100 px-5 py-4 dark:border-surface-800">
          <h2 className="font-semibold text-slate-800 dark:text-white">Microsoft Teams Approval Cards</h2>
          <p className="mt-0.5 text-xs text-slate-400">Demo-ready card payloads generated from employee submissions</p>
        </div>
        <div className="divide-y divide-surface-100 dark:divide-surface-800">
          {teamCards.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No Teams cards generated yet.</p>
          ) : (
            teamCards.slice(0, 4).map((card) => (
              <div key={card.id} className="px-5 py-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-800 dark:text-white">{card.title}</p>
                  <StatusBadge status={card.channel || 'TEAMS'} />
                </div>
                <p className="text-sm text-slate-500">{card.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
