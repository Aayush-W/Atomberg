import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { goalsService, usersService, mlService, reportsService } from '@/services/services';
import { PageHeader, Spinner, ErrorState, StatusBadge, ProgressBar } from '@/components/common';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

const COLORS = ['#5b6ef3', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ManagerAnalytics() {
  const user = useAuthStore((s) => s.user);
  const { data: team = [] } = useQuery({ 
    queryKey: ['team', user?.id], 
    queryFn: () => usersService.getTeam(user?.id ?? ''),
    enabled: !!user?.id
  });
  const { data: teamGoals = [], isLoading, error, refetch } = useQuery({ queryKey: ['team-goals'], queryFn: goalsService.getTeam });
  const { data: sentimentTrends } = useQuery({ 
    queryKey: ['sentiment-trends', user?.id], 
    queryFn: () => mlService.getSentimentTrends(user?.id ?? ''),
    enabled: !!user?.id
  });
  const { data: sentimentSummary } = useQuery({
    queryKey: ['team-sentiment', user?.id],
    queryFn: () => mlService.getTeamSentiment(user?.id),
    enabled: !!user?.id
  });
  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboards'],
    queryFn: reportsService.getLeaderboards,
  });

  if (!user || isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;
  if (error) return <ErrorState onRetry={refetch}/>;

  // QoQ data per team member
  const qoqData = ['Q1','Q2','Q3','Q4'].map((q) => {
    const point: Record<string, any> = { quarter: q };
    team.forEach((m) => {
      const ci = teamGoals.filter((g) => g.userId === m.id).flatMap((g) => g.checkIns ?? []).find((c) => c.quarter === q);
      point[m.name.split(' ')[0]] = ci?.progressScore ?? 0;
    });
    return point;
  });

  // Goal distribution by thrust area
  const thrustDist = teamGoals.reduce<Record<string, number>>((acc, g) => {
    acc[g.thrustArea] = (acc[g.thrustArea] || 0) + 1;
    return acc;
  }, {});
  const thrustData = Object.entries(thrustDist).map(([name, value]) => ({ name, value }));

  // Completion by quarter
  const completionData = ['Q1','Q2','Q3','Q4'].map((q) => {
    const total = teamGoals.filter((g) => ['APPROVED','LOCKED'].includes(g.status)).length;
    const done = teamGoals.flatMap((g) => g.checkIns ?? []).filter((c) => c.quarter === q && c.status === 'COMPLETED').length;
    return { quarter: q, completion: total ? Math.round((done / total) * 100) : 0 };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Team Analytics" subtitle="Quarter-on-quarter trends and distributions"/>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* QoQ trend */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">QoQ Achievement Trends</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={qoqData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)"/>
              <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#94a3b8' }}/>
              <YAxis domain={[0, 120]} tick={{ fontSize: 11, fill: '#94a3b8' }}/>
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              {team.map((m, i) => (
                <Line key={m.id} type="monotone" dataKey={m.name.split(' ')[0]} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }}/>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Thrust area distribution */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Goal Distribution by Thrust Area</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={thrustData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {thrustData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Completion bar chart */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Team Check-in Completion Rate</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={completionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)"/>
              <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#94a3b8' }}/>
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }}/>
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }}/>
              <Bar dataKey="completion" fill="#5b6ef3" radius={[4, 4, 0, 0]} name="Completion %"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Team progress overview */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Member Progress Overview</h3>
          <div className="space-y-4">
            {team.map((m) => {
              const mGoals = teamGoals.filter((g) => g.userId === m.id);
              const avg = mGoals.length ? mGoals.reduce((s, g) => s + (g.checkIns?.[0]?.progressScore ?? 0), 0) / mGoals.length : 0;
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{m.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{m.name}</p>
                      <span className="text-xs font-bold text-brand-400">{avg.toFixed(0)}%</span>
                    </div>
                    <ProgressBar value={avg} size="sm"/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sentimentSummary && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Burnout Risk Buckets</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-danger-500/10 p-4 text-center">
                <p className="text-xs text-slate-400">High</p>
                <p className="text-2xl font-display font-bold text-danger-400">{sentimentSummary.burnoutRisk.high}</p>
              </div>
              <div className="rounded-xl bg-warning-500/10 p-4 text-center">
                <p className="text-xs text-slate-400">Medium</p>
                <p className="text-2xl font-display font-bold text-warning-400">{sentimentSummary.burnoutRisk.medium}</p>
              </div>
              <div className="rounded-xl bg-success-500/10 p-4 text-center">
                <p className="text-xs text-slate-400">Low</p>
                <p className="text-2xl font-display font-bold text-success-400">{sentimentSummary.burnoutRisk.low}</p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Department Leaderboards</h3>
            <div className="space-y-3">
              {(leaderboardData?.leaderboard || []).map((row) => (
                <div key={row.department} className="rounded-xl border border-surface-200 dark:border-surface-800 p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="font-semibold text-slate-800 dark:text-white">{row.department}</p>
                    <span className="text-xs font-bold text-brand-400">{row.onTimeCompliance.toFixed(0)}% on-time</span>
                  </div>
                  <p className="text-xs text-slate-500">Avg progress {row.averageProgress.toFixed(0)}% · Kudos {row.kudosEarned} · Healthy sentiment {row.healthySentimentRate.toFixed(0)}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
