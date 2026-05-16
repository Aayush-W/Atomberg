import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { goalsService, cyclesService, mlService } from '@/services/services';
import { StatCard, PageHeader, Spinner, ErrorState, StatusBadge, ProgressBar, EmptyState } from '@/components/common';
import { Target, CheckSquare, TrendingUp, AlertCircle, Plus, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmployeeDashboard() {
  const user = useAuthStore((s) => s.user);

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
  const { data: anomalies = [] } = useQuery({ queryKey: ['anomalies'], queryFn: mlService.getAnomalies });
  const myAnomaly = anomalies.find((a) => a.userId === user?.id && a.isAnomaly);

  if (!user || isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;
  if (error) return <ErrorState onRetry={refetch} />;

  const approved = goals.filter((g) => ['APPROVED', 'LOCKED'].includes(g.status)).length;
  const avgProg = goals.length ? goals.reduce((s, g) => s + (g.checkIns?.[0]?.progressScore ?? 0), 0) / goals.length : 0;
  const pending = goals.filter((g) => ['DRAFT', 'REJECTED'].includes(g.status)).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={`Good day, ${user?.name?.split(' ')[0] ?? 'User'} 👋`} subtitle="Your goal health overview"
        actions={<Link to="/employee/goals/new" className="btn-primary btn gap-2"><Plus size={16}/>Add Goal</Link>} />

      {cycleStatus?.activeQuarter && (
        <div className="rounded-2xl bg-brand-600/10 border border-brand-500/30 px-5 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <p className="text-sm font-medium text-brand-300">
            <span className="font-bold text-brand-200">{cycleStatus.activeQuarter} Check-in window is open</span>
            {cycleStatus.daysRemaining != null && ` — ${cycleStatus.daysRemaining} days remaining`}
          </p>
          <Link to="/employee/checkin" className="ml-auto btn-primary btn btn-sm"><ClipboardCheck size={13}/>Submit</Link>
        </div>
      )}
      {myAnomaly && (
        <div className="rounded-2xl bg-warning-500/10 border border-warning-500/30 px-5 py-3 flex items-center gap-3">
          <AlertCircle size={18} className="text-warning-400 flex-shrink-0" />
          <p className="text-sm text-warning-300"><span className="font-semibold">Review your reporting patterns.</span> {myAnomaly.reason}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Goals" value={goals.length} icon={<Target size={18}/>} color="brand"/>
        <StatCard title="Approved" value={approved} icon={<CheckSquare size={18}/>} color="success"/>
        <StatCard title="Avg Progress" value={`${avgProg.toFixed(0)}%`} icon={<TrendingUp size={18}/>} color="warning"/>
        <StatCard title="Pending Actions" value={pending} icon={<AlertCircle size={18}/>} color="danger"/>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-white">My Goals</h2>
            <Link to="/employee/goals" className="text-xs text-brand-500 font-medium">View all</Link>
          </div>
          {goals.length === 0 ? (
            <EmptyState title="No goals yet" description="Add your first goal." action={<Link to="/employee/goals/new" className="btn-primary btn btn-sm">Add Goal</Link>}/>
          ) : (
            <div className="table-container rounded-none border-0">
              <table className="data-table">
                <thead><tr><th>Goal</th><th>Thrust Area</th><th>Weight</th><th>Status</th><th>Progress</th></tr></thead>
                <tbody>
                  {goals.slice(0,6).map((g) => {
                    const latest = g.checkIns?.[0];
                    return (
                      <tr key={g.id}>
                        <td><p className="font-medium text-slate-800 dark:text-white truncate max-w-[200px]">{g.title}</p><p className="text-xs text-slate-400">{g.uomType} • Target: {g.target}</p></td>
                        <td><span className="text-xs text-slate-500">{g.thrustArea}</span></td>
                        <td><span className="font-semibold">{g.weightage}%</span></td>
                        <td><StatusBadge status={g.status}/></td>
                        <td className="w-32">{latest ? <ProgressBar value={latest.progressScore} showLabel size="sm"/> : <span className="text-xs text-slate-400">No check-in</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-800">
            <h2 className="font-semibold text-slate-800 dark:text-white">ML Q4 Predictions</h2>
            <p className="text-xs text-slate-400 mt-0.5">Predicted end-of-year scores</p>
          </div>
          <div className="p-4 space-y-4">
            {predictions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No predictions yet</p>
            ) : (
              predictions.slice(0,5).map((pred) => (
                <div key={pred.goalId}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[160px]">{pred.goalTitle}</p>
                    <span className="text-xs font-bold text-brand-400">{pred.predictedScore.toFixed(0)}%</span>
                  </div>
                  <ProgressBar value={pred.predictedScore} size="sm"/>
                  <p className="text-[10px] text-slate-400 mt-0.5">CI: [{pred.confidenceInterval[0].toFixed(0)}–{pred.confidenceInterval[1].toFixed(0)}%]</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
