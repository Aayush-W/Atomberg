import { useQuery } from '@tanstack/react-query';
import { mlService } from '@/services/services';
import { PageHeader, Spinner, ErrorState, ProgressBar } from '@/components/common';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AdminMLInsightsPage() {
  const { data: anomalies = [], isLoading: aLoading } = useQuery({ queryKey: ['anomalies'], queryFn: mlService.getAnomalies });
  const { isLoading: sLoading } = useQuery({ queryKey: ['sentiment-all'], queryFn: () => mlService.getSentimentTrends('') });
  const { data: sentimentSummary } = useQuery({ queryKey: ['team-sentiment-all'], queryFn: () => mlService.getTeamSentiment() });

  if (aLoading || sLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;

  const flagged = anomalies.filter((a) => a.isAnomaly);
  const scoreDistribution = [
    { range: '0–20', count: anomalies.filter((a) => a.anomalyScore <= 0.2).length },
    { range: '21–40', count: anomalies.filter((a) => a.anomalyScore > 0.2 && a.anomalyScore <= 0.4).length },
    { range: '41–60', count: anomalies.filter((a) => a.anomalyScore > 0.4 && a.anomalyScore <= 0.6).length },
    { range: '61–80', count: anomalies.filter((a) => a.anomalyScore > 0.6 && a.anomalyScore <= 0.8).length },
    { range: '81–100', count: anomalies.filter((a) => a.anomalyScore > 0.8).length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="ML Insights" subtitle="Anomaly detection and prediction analytics"/>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Anomaly panel */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-800">
            <h2 className="font-semibold text-slate-800 dark:text-white">Anomaly Detection</h2>
            <p className="text-xs text-slate-400 mt-0.5">{flagged.length} of {anomalies.length} employees flagged</p>
          </div>
          <div className="divide-y divide-surface-100 dark:divide-surface-800 max-h-80 overflow-y-auto">
            {flagged.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No anomalies detected 🎉</p>
            ) : (
              flagged.map((a) => (
                <div key={a.userId} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-danger-500/20 flex items-center justify-center text-danger-400 font-bold text-sm">{a.userName.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{a.userName}</p>
                    <p className="text-xs text-slate-400 truncate">{a.reason}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">Score</p>
                    <p className="text-sm font-bold text-danger-400">{(a.anomalyScore * 100).toFixed(0)}%</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Anomaly score distribution */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Anomaly Score Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)"/>
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#94a3b8' }}/>
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }}/>
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }}/>
              <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} name="Employees"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {sentimentSummary && (
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Sentiment Health</h2>
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
              {sentimentSummary.alertFlags.length > 0 && (
                <div className="rounded-xl bg-danger-500/10 border border-danger-500/20 p-3">
                  {sentimentSummary.alertFlags.map((flag) => (
                    <p key={flag} className="text-sm text-danger-300">{flag}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full anomaly table */}
        <div className="xl:col-span-2 card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-800">
            <h2 className="font-semibold text-slate-800 dark:text-white">All Employee Anomaly Scores</h2>
          </div>
          <div className="table-container rounded-none border-0">
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Anomaly Score</th><th>Flagged</th><th>Reason</th></tr></thead>
              <tbody>
                {anomalies.map((a) => (
                  <tr key={a.userId}>
                    <td className="font-medium text-slate-800 dark:text-white">{a.userName}</td>
                    <td className="w-48">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={a.anomalyScore * 100} size="sm" className="flex-1"/>
                        <span className="text-xs font-bold text-slate-500 w-10 text-right">{(a.anomalyScore * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td><span className={`badge ${a.isAnomaly ? 'badge-rejected' : 'badge-approved'}`}>{a.isAnomaly ? 'Flagged' : 'Normal'}</span></td>
                    <td className="text-xs text-slate-400">{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
