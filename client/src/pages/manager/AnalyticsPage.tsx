import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { aiService, goalsService, mlService, reportsService, usersService } from '@/services/services';
import { PageHeader, Spinner, ErrorState, ProgressBar } from '@/components/common';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

const COLORS = ['#5b6ef3', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ManagerAnalytics() {
  const user = useAuthStore((s) => s.user);
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [proposedWeightage, setProposedWeightage] = useState(20);

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
  const { data: calibration } = useQuery({
    queryKey: ['calibration-copilot', user?.id],
    queryFn: () => aiService.getCalibrationCopilot(user?.id),
    enabled: !!user?.id
  });
  const { data: narrative } = useQuery({
    queryKey: ['narrative-intelligence', user?.id],
    queryFn: () => aiService.getNarrativeIntelligence(user?.id),
    enabled: !!user?.id
  });

  const whatIfMut = useMutation({
    mutationFn: ({ goalId, newWeightage }: { goalId: string; newWeightage: number }) => mlService.runWhatIf(goalId, newWeightage)
  });

  useEffect(() => {
    if (!selectedGoalId && teamGoals.length > 0) {
      setSelectedGoalId(teamGoals[0].id);
      setProposedWeightage(teamGoals[0].weightage);
    }
  }, [selectedGoalId, teamGoals]);

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
      <PageHeader title="Team Analytics" subtitle="Performance, explainable risk, calibration, and planning intelligence in one place" />

      {narrative ? (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-white">Narrative Intelligence</h3>
          <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-surface-50 p-4 text-sm leading-7 text-slate-700 dark:bg-surface-900/60 dark:text-slate-200">
            {narrative.narrative}
          </div>
        </div>
      ) : null}

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
            <h3 className="font-semibold text-slate-800 dark:text-white">Risk Explainability Panel</h3>
            <p className="mt-0.5 text-xs text-slate-400">Each alert includes the evidence used, confidence, and recommended intervention.</p>
          </div>
          <div className="table-container rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Risk</th>
                  <th>Why It Fired</th>
                  <th>Confidence</th>
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
                      {person.explainability.slice(0, 2).map((item) => `${item.factor}: ${item.value}`).join(' · ')}
                    </td>
                    <td className="text-xs text-slate-400">{Math.round(person.confidence * 100)}%</td>
                    <td className="text-xs text-slate-400">{person.recommendedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-white">What-If Planning Simulator</h3>
          <p className="mt-1 text-xs text-slate-400">Preview the impact of reweighting a goal on capacity, risk, and alignment coverage.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr,140px,auto]">
            <select
              value={selectedGoalId}
              onChange={(e) => {
                const next = teamGoals.find((goal) => goal.id === e.target.value);
                setSelectedGoalId(e.target.value);
                setProposedWeightage(next?.weightage ?? 20);
              }}
              className="input"
            >
              {teamGoals.map((goal) => (
                <option key={goal.id} value={goal.id}>{goal.user?.name} - {goal.title}</option>
              ))}
            </select>
            <input type="number" className="input" value={proposedWeightage} onChange={(e) => setProposedWeightage(Number(e.target.value))} />
            <button onClick={() => selectedGoalId && whatIfMut.mutate({ goalId: selectedGoalId, newWeightage: proposedWeightage })} className="btn btn-primary" disabled={!selectedGoalId || whatIfMut.isPending}>
              {whatIfMut.isPending ? 'Simulating...' : 'Run Scenario'}
            </button>
          </div>
          {whatIfMut.data ? (
            <div className="mt-4 rounded-2xl bg-surface-50 p-4 dark:bg-surface-900/60">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-400">Owner Portfolio</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{whatIfMut.data.before.ownerPortfolioWeight}% → {whatIfMut.data.after.ownerPortfolioWeight}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Projected Risk</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{whatIfMut.data.before.ownerRiskScore ?? 'n/a'} → {whatIfMut.data.after.ownerRiskScore}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Alignment Coverage</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{whatIfMut.data.before.alignmentCoverage}% → {whatIfMut.data.after.alignmentCoverage}%</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                {whatIfMut.data.insights.map((insight) => <p key={insight}>{insight}</p>)}
              </div>
            </div>
          ) : null}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-white">Calibration Copilot</h3>
          <p className="mt-1 text-xs text-slate-400">Compare evidence across employees and spot possible rating inflation before review calibration.</p>
          {calibration ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-surface-50 p-3 text-center dark:bg-surface-900/60">
                  <p className="text-xs text-slate-400">Team Size</p>
                  <p className="text-xl font-display font-bold text-white">{calibration.summary.teamSize}</p>
                </div>
                <div className="rounded-xl bg-surface-50 p-3 text-center dark:bg-surface-900/60">
                  <p className="text-xs text-slate-400">Score Spread</p>
                  <p className="text-xl font-display font-bold text-white">{calibration.summary.scoreSpread}</p>
                </div>
                <div className="rounded-xl bg-warning-500/10 p-3 text-center">
                  <p className="text-xs text-slate-400">Inflation Hotspots</p>
                  <p className="text-xl font-display font-bold text-warning-300">{calibration.summary.inflationHotspots}</p>
                </div>
              </div>
              <div className="space-y-3">
                {calibration.employees.slice(0, 4).map((employee) => (
                  <div key={employee.userId} className="rounded-xl border border-surface-200 p-3 dark:border-surface-800">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">{employee.userName}</p>
                        <p className="text-xs text-slate-400">{employee.suggestedRating} · Inflation {employee.inflationRisk}</p>
                      </div>
                      <span className="text-xs font-bold text-brand-400">{employee.compositeScore}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{employee.evidence[0]}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
