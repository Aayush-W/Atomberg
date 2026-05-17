import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { goalsService, usersService, mlService, reportsService } from '@/services/services';
import { PageHeader, Spinner, ErrorState, ProgressBar } from '@/components/common';
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
  const { data: sentimentSummary } = useQuery({
    queryKey: ['team-sentiment', user?.id],
    queryFn: () => mlService.getTeamSentiment(user?.id),
    enabled: !!user?.id
  });
  const { data: flightRisk } = useQuery({
    queryKey: ['flight-risk', user?.id],
    queryFn: () => mlService.getFlightRisk(user?.id),
    enabled: !!user?.id
  });
  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboards'],
    queryFn: reportsService.getLeaderboards
  });

  if (!user || isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size={32} /></div>;
  if (error) return <ErrorState onRetry={refetch} />;

  const qoqData = ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => {
    const point: Record<string, any> = { quarter };
    team.forEach((member) => {
      const checkIn = teamGoals.filter((goal) => goal.userId === member.id).flatMap((goal) => goal.checkIns ?? []).find((entry) => entry.quarter === quarter);
      point[member.name.split(' ')[0]] = checkIn?.progressScore ?? 0;
    });
    return point;
  });

  const thrustData = Object.entries(
    teamGoals.reduce<Record<string, number>>((acc, goal) => {
      acc[goal.thrustArea] = (acc[goal.thrustArea] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const completionData = ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => {
    const total = teamGoals.filter((goal) => ['APPROVED', 'LOCKED'].includes(goal.status)).length;
    const done = teamGoals.flatMap((goal) => goal.checkIns ?? []).filter((entry) => entry.quarter === quarter && entry.status === 'COMPLETED').length;
    return { quarter, completion: total ? Math.round((done / total) * 100) : 0 };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Team Analytics" subtitle="Performance, alignment, burnout, and flight-risk insights in one place" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-white">QoQ Achievement Trends</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={qoqData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis domain={[0, 120]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {team.map((member, index) => (
                <Line key={member.id} type="monotone" dataKey={member.name.split(' ')[0]} stroke={COLORS[index % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-white">Goal Distribution by Thrust Area</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={thrustData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {thrustData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-white">Team Check-in Completion Rate</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={completionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="completion" fill="#5b6ef3" radius={[4, 4, 0, 0]} name="Completion %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-white">Member Progress Overview</h3>
          <div className="space-y-4">
            {team.map((member) => {
              const memberGoals = teamGoals.filter((goal) => goal.userId === member.id);
              const avg = memberGoals.length ? memberGoals.reduce((sum, goal) => sum + (goal.checkIns?.[0]?.progressScore ?? 0), 0) / memberGoals.length : 0;
              return (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{member.name.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{member.name}</p>
                      <span className="text-xs font-bold text-brand-400">{avg.toFixed(0)}%</span>
                    </div>
                    <ProgressBar value={avg} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sentimentSummary ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="card p-5">
            <h3 className="mb-4 font-semibold text-slate-800 dark:text-white">Burnout Risk Buckets</h3>
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
            {sentimentSummary.alertFlags.length > 0 ? (
              <div className="mt-4 rounded-xl border border-danger-500/20 bg-danger-500/10 p-3">
                {sentimentSummary.alertFlags.map((flag) => (
                  <p key={flag} className="text-sm text-danger-300">{flag}</p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="card p-5">
            <h3 className="mb-4 font-semibold text-slate-800 dark:text-white">Department Leaderboards</h3>
            <div className="space-y-3">
              {(leaderboardData?.leaderboard || []).map((row) => (
                <div key={row.department} className="rounded-xl border border-surface-200 p-3 dark:border-surface-800">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-800 dark:text-white">{row.department}</p>
                    <span className="text-xs font-bold text-brand-400">{row.onTimeCompliance.toFixed(0)}% on-time</span>
                  </div>
                  <p className="text-xs text-slate-500">Avg progress {row.averageProgress.toFixed(0)}% · Kudos {row.kudosEarned} · Healthy sentiment {row.healthySentimentRate.toFixed(0)}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {flightRisk ? (
        <div className="card overflow-hidden p-0">
          <div className="border-b border-surface-100 px-5 py-4 dark:border-surface-800">
            <h3 className="font-semibold text-slate-800 dark:text-white">Flight Risk Predictor</h3>
            <p className="mt-0.5 text-xs text-slate-400">Uses after-hours activity, sentiment trend, max-capacity goals, progress, and kudos load.</p>
          </div>
          <div className="table-container rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Risk</th>
                  <th>Sentiment</th>
                  <th>After-hours</th>
                  <th>Load</th>
                  <th>Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {flightRisk.employees.map((person) => (
                  <tr key={person.userId}>
                    <td>
                      <p className="font-medium text-slate-800 dark:text-white">{person.userName}</p>
                      <p className="text-xs text-slate-400">{person.jobTitle} · {person.department}</p>
                    </td>
                    <td className="w-44">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={person.riskScore} size="sm" className="flex-1" />
                        <span className="w-12 text-right text-xs font-bold text-slate-500">{person.riskScore}</span>
                      </div>
                    </td>
                    <td className="text-xs text-slate-400">
                      Avg {person.avgSentiment.toFixed(2)} · Trend {person.sentimentTrend.toFixed(2)}
                    </td>
                    <td className="text-xs text-slate-400">{Math.round(person.afterHoursActivityRate * 100)}%</td>
                    <td className="text-xs text-slate-400">{person.maxCapacityGoals} max-load goals · Kudos {person.kudosCount}</td>
                    <td className="text-xs text-slate-400">{person.recommendedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
