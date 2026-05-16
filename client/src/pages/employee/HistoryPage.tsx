import { useQuery } from '@tanstack/react-query';
import { goalsService } from '@/services/services';
import { PageHeader, Spinner, ErrorState, EmptyState, StatusBadge, ProgressBar } from '@/components/common';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function HistoryPage() {
  const { data: goals = [], isLoading, error, refetch } = useQuery({ queryKey: ['my-goals'], queryFn: goalsService.getMine });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;
  if (error) return <ErrorState onRetry={refetch}/>;

  const goalsWithCheckins = goals.filter((g) => g.checkIns && g.checkIns.length > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Progress History" subtitle="Your check-in history and trends across quarters"/>
      {goalsWithCheckins.length === 0 ? (
        <EmptyState title="No history yet" description="Complete your first check-in to see your progress history."/>
      ) : (
        <div className="space-y-6">
          {goalsWithCheckins.map((g) => {
            const chartData = (g.checkIns ?? []).map((ci) => ({
              quarter: ci.quarter, score: ci.progressScore,
            })).sort((a, b) => a.quarter.localeCompare(b.quarter));
            return (
              <div key={g.id} className="card p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{g.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{g.thrustArea} · {g.uomType} · Target: {g.target} · Weight: {g.weightage}%</p>
                  </div>
                  <StatusBadge status={g.status}/>
                </div>
                <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Chart */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Progress Trend</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)"/>
                        <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#94a3b8' }}/>
                        <YAxis domain={[0, 120]} tick={{ fontSize: 11, fill: '#94a3b8' }}/>
                        <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#94a3b8' }}/>
                        <Line type="monotone" dataKey="score" stroke="#5b6ef3" strokeWidth={2} dot={{ fill: '#5b6ef3', r: 4 }}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Check-in list */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Check-in Log</p>
                    <div className="space-y-3">
                      {(g.checkIns ?? []).map((ci) => (
                        <div key={ci.id} className="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <StatusBadge status={ci.quarter}/>
                            <StatusBadge status={ci.status}/>
                            <span className="text-xs font-bold text-brand-400">{ci.progressScore.toFixed(0)}%</span>
                          </div>
                          <ProgressBar value={ci.progressScore} size="sm"/>
                          <p className="text-xs text-slate-500 mt-1.5">
                            Actual: {ci.actualValue} · {format(new Date(ci.createdAt), 'MMM d, yyyy')}
                          </p>
                          {ci.managerComment && (
                            <div className="mt-2 p-2 rounded-lg bg-brand-500/10 border border-brand-500/20">
                              <p className="text-xs font-semibold text-brand-300 mb-0.5">Manager Comment</p>
                              <p className="text-xs text-slate-400">{ci.managerComment}</p>
                              {ci.sentiment != null && (
                                <p className="text-xs mt-1">{ci.sentiment > 0.05 ? '😊' : ci.sentiment < -0.05 ? '😟' : '😐'} Sentiment: {ci.sentiment.toFixed(2)}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
