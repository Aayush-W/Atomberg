import { useQuery } from '@tanstack/react-query';
import { mlService } from '@/services/services';
import { PageHeader, Spinner, ProgressBar } from '@/components/common';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AdminMLInsightsPage() {
  const { data: anomalies = [], isLoading: anomalyLoading } = useQuery({ queryKey: ['anomalies'], queryFn: mlService.getAnomalies });
  const { data: sentimentSummary, isLoading: sentimentLoading } = useQuery({ queryKey: ['team-sentiment-all'], queryFn: () => mlService.getTeamSentiment() });
  const { data: flightRisk, isLoading: flightRiskLoading } = useQuery({ queryKey: ['flight-risk-all'], queryFn: () => mlService.getFlightRisk() });

  if (anomalyLoading || sentimentLoading || flightRiskLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size={32} /></div>;
  }

  const flagged = anomalies.filter((item) => item.isAnomaly);
  const scoreDistribution = [
    { range: '0-20', count: anomalies.filter((item) => item.anomalyScore <= 0.2).length },
    { range: '21-40', count: anomalies.filter((item) => item.anomalyScore > 0.2 && item.anomalyScore <= 0.4).length },
    { range: '41-60', count: anomalies.filter((item) => item.anomalyScore > 0.4 && item.anomalyScore <= 0.6).length },
    { range: '61-80', count: anomalies.filter((item) => item.anomalyScore > 0.6 && item.anomalyScore <= 0.8).length },
    { range: '81-100', count: anomalies.filter((item) => item.anomalyScore > 0.8).length }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="ML Insights" subtitle="Anomaly detection, burnout signals, and the new flight-risk retention model" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card overflow-hidden p-0">
          <div className="border-b border-surface-100 px-5 py-4 dark:border-surface-800">
            <h2 className="font-semibold text-slate-800 dark:text-white">Anomaly Detection</h2>
            <p className="mt-0.5 text-xs text-slate-400">{flagged.length} of {anomalies.length} employees flagged</p>
          </div>
          <div className="max-h-80 divide-y divide-surface-100 overflow-y-auto dark:divide-surface-800">
            {flagged.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No anomalies detected</p>
            ) : (
              flagged.map((item) => (
                <div key={item.userId} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-500/20 text-sm font-bold text-danger-400">{item.userName.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{item.userName}</p>
                    <p className="truncate text-xs text-slate-400">{item.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Score</p>
                    <p className="text-sm font-bold text-danger-400">{(item.anomalyScore * 100).toFixed(0)}%</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-slate-800 dark:text-white">Anomaly Score Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} name="Employees" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {sentimentSummary ? (
          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-800 dark:text-white">Sentiment Health</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Latest average sentiment</span>
                <span className="font-bold text-brand-400">{sentimentSummary.latestAverage.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Engagement score</span>
                <span className="font-bold text-success-400">{sentimentSummary.engagementScore.toFixed(0)}%</span>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="rounded-xl bg-danger-500/10 p-3 text-center">
                  <p className="text-xs text-slate-400">High risk</p>
                  <p className="text-xl font-display font-bold text-danger-400">{sentimentSummary.burnoutRisk.high}</p>
                </div>
                <div className="rounded-xl bg-warning-500/10 p-3 text-center">
                  <p className="text-xs text-slate-400">Medium risk</p>
                  <p className="text-xl font-display font-bold text-warning-400">{sentimentSummary.burnoutRisk.medium}</p>
                </div>
                <div className="rounded-xl bg-success-500/10 p-3 text-center">
                  <p className="text-xs text-slate-400">Low risk</p>
                  <p className="text-xl font-display font-bold text-success-400">{sentimentSummary.burnoutRisk.low}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {flightRisk ? (
          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-800 dark:text-white">Flight Risk Summary</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-danger-500/10 p-3 text-center">
                <p className="text-xs text-slate-400">High</p>
                <p className="text-2xl font-display font-bold text-danger-400">{flightRisk.summary.high}</p>
              </div>
              <div className="rounded-xl bg-warning-500/10 p-3 text-center">
                <p className="text-xs text-slate-400">Medium</p>
                <p className="text-2xl font-display font-bold text-warning-400">{flightRisk.summary.medium}</p>
              </div>
              <div className="rounded-xl bg-success-500/10 p-3 text-center">
                <p className="text-xs text-slate-400">Low</p>
                <p className="text-2xl font-display font-bold text-success-400">{flightRisk.summary.low}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-400">The predictor combines after-hours behavior, sentiment degradation, max-capacity goal mix, progress, and recognition load to highlight retention risk early.</p>
          </div>
        ) : null}

        {flightRisk ? (
          <div className="card overflow-hidden p-0 xl:col-span-2">
            <div className="border-b border-surface-100 px-5 py-4 dark:border-surface-800">
              <h2 className="font-semibold text-slate-800 dark:text-white">Flight Risk Employees</h2>
            </div>
            <div className="table-container rounded-none border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Risk Score</th>
                    <th>Signals</th>
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
                      <td className="w-56">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={person.riskScore} size="sm" className="flex-1" />
                          <span className="w-12 text-right text-xs font-bold text-slate-500">{person.riskScore}</span>
                        </div>
                      </td>
                      <td className="text-xs text-slate-400">
                        {person.reasons.slice(0, 2).join(' ')}
                      </td>
                      <td className="text-xs text-slate-400">{person.recommendedAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
