import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { goalsService, usersService, checkinsService, mlService } from '@/services/services';
import { StatCard, PageHeader, Spinner, ErrorState, StatusBadge, ProgressBar } from '@/components/common';
import { Users, ClipboardCheck, TrendingUp, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ManagerDashboard() {
  const user = useAuthStore((s) => s.user)!;

  const { data: team = [], isLoading: teamLoading } = useQuery({ queryKey: ['team', user.id], queryFn: () => usersService.getTeam(user.id) });
  const { data: teamGoals = [], isLoading: goalsLoading, error, refetch } = useQuery({ queryKey: ['team-goals'], queryFn: goalsService.getTeam });
  const { data: anomalies = [] } = useQuery({ queryKey: ['anomalies'], queryFn: mlService.getAnomalies });

  if (teamLoading || goalsLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;
  if (error) return <ErrorState onRetry={refetch}/>;

  const pending = teamGoals.filter((g) => g.status === 'SUBMITTED').length;
  const teamAnomalies = anomalies.filter((a) => team.some((u) => u.id === a.userId) && a.isAnomaly);
  const avgProgress = teamGoals.length ? teamGoals.reduce((s, g) => s + (g.checkIns?.[0]?.progressScore ?? 0), 0) / teamGoals.length : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Manager Dashboard" subtitle="Team overview and pending actions"/>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Team Size" value={team.length} icon={<Users size={18}/>} color="brand"/>
        <StatCard title="Pending Approvals" value={pending} icon={<ClipboardCheck size={18}/>} color="warning"/>
        <StatCard title="Team Avg Progress" value={`${avgProgress.toFixed(0)}%`} icon={<TrendingUp size={18}/>} color="success"/>
        <StatCard title="Anomalies Flagged" value={teamAnomalies.length} icon={<AlertTriangle size={18}/>} color="danger"/>
      </div>

      {teamAnomalies.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-danger-400"/> Anomaly Alerts
          </h2>
          <div className="space-y-2">
            {teamAnomalies.map((a) => (
              <div key={a.userId} className="flex items-center gap-3 p-3 rounded-xl bg-danger-500/10 border border-danger-500/20">
                <div className="w-8 h-8 rounded-full bg-danger-500/20 flex items-center justify-center text-danger-400 font-bold text-sm">{a.userName.charAt(0)}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{a.userName}</p>
                  <p className="text-xs text-slate-400">{a.reason}</p>
                </div>
                <span className="ml-auto text-xs font-bold text-danger-400">Score: {a.anomalyScore.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pending approvals */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-white">Pending Approvals</h2>
            <Link to="/manager/approvals" className="text-xs text-brand-500 font-medium">View all</Link>
          </div>
          {pending === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No pending approvals 🎉</p>
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {teamGoals.filter((g) => g.status === 'SUBMITTED').slice(0, 5).map((g) => (
                <div key={g.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{g.title}</p>
                    <p className="text-xs text-slate-400">{g.user?.name} · {g.weightage}%</p>
                  </div>
                  <StatusBadge status={g.status}/>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team heatmap */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-800">
            <h2 className="font-semibold text-slate-800 dark:text-white">Team Progress</h2>
          </div>
          <div className="p-4 space-y-3">
            {team.map((member) => {
              const memberGoals = teamGoals.filter((g) => g.userId === member.id);
              const avg = memberGoals.length ? memberGoals.reduce((s, g) => s + (g.checkIns?.[0]?.progressScore ?? 0), 0) / memberGoals.length : 0;
              return (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{member.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{member.name}</p>
                      <span className="text-xs font-bold text-brand-400 ml-2">{avg.toFixed(0)}%</span>
                    </div>
                    <ProgressBar value={avg} size="sm"/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
