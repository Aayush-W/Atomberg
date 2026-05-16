import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsService } from '@/services/services';
import { PageHeader, Spinner, ErrorState } from '@/components/common';
import { Download, TrendingUp, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminReportsPage() {
  const { data: report = [], isLoading, error, refetch } = useQuery({
    queryKey: ['achievement-report'],
    queryFn: () => reportsService.getAchievement(),
  });

  const exportMut = useMutation({
    mutationFn: (format: 'csv' | 'excel') => reportsService.exportAchievement(format),
    onSuccess: (blob: Blob, format) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `achievement_report.${format === 'csv' ? 'csv' : 'xlsx'}`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    },
    onError: () => toast.error('Export failed'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;
  if (error) return <ErrorState onRetry={refetch}/>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Achievement Reports" subtitle="Team performance summary by employee"
        actions={
          <div className="flex gap-2">
            <button onClick={() => exportMut.mutate('csv')} disabled={exportMut.isPending} className="btn-secondary btn gap-2"><Download size={15}/>CSV</button>
            <button onClick={() => exportMut.mutate('excel')} disabled={exportMut.isPending} className="btn-primary btn gap-2"><Download size={15}/>Excel</button>
          </div>
        }/>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th><th>Dept</th><th>Goals</th>
              <th>Avg Quality</th><th>Avg Progress</th><th>Locked Goals</th>
            </tr>
          </thead>
          <tbody>
            {(report as any[]).map((row: any, i: number) => (
              <tr key={i}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
                      {(row.name || 'U').charAt(0)}
                    </div>
                    <span className="font-medium text-slate-800 dark:text-white">{row.name}</span>
                  </div>
                </td>
                <td className="text-slate-500 text-xs">{row.department}</td>
                <td className="font-semibold">{row.goals}</td>
                <td>
                  <span className={`font-semibold ${row.avgQualityScore >= 80 ? 'text-success-400' : row.avgQualityScore >= 60 ? 'text-warning-400' : 'text-danger-400'}`}>
                    {row.avgQualityScore?.toFixed(1) ?? '—'}
                  </span>
                </td>
                <td>
                  <span className={`font-semibold ${row.avgProgressScore >= 80 ? 'text-success-400' : row.avgProgressScore >= 60 ? 'text-warning-400' : 'text-danger-400'}`}>
                    {row.avgProgressScore?.toFixed(0) ?? '—'}%
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <Lock size={12} className="text-brand-400"/>
                    <span className="font-semibold">{row.lockedGoals}</span>
                  </div>
                </td>
              </tr>
            ))}
            {report.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">No report data yet. Goals must be approved and have check-ins.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
