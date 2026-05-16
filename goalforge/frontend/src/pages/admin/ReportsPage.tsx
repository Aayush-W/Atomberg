import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsService } from '@/services/services';
import { PageHeader, Spinner, ErrorState } from '@/components/common';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminReportsPage() {
  const { data: report = [], isLoading, error, refetch } = useQuery({ queryKey: ['achievement-report'], queryFn: () => reportsService.getAchievement() });

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
      <PageHeader title="Achievement Reports" subtitle="Planned vs actual across all employees"
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
              <th>Employee</th><th>Dept</th><th>Manager</th><th>Goal</th><th>UoM</th><th>Target</th>
              <th>Q1 Score</th><th>Q2 Score</th><th>Q3 Score</th><th>Q4 Score</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {report.map((row: any, i: number) => (
              <tr key={i}>
                <td className="font-medium text-slate-800 dark:text-white whitespace-nowrap">{row.employeeName}</td>
                <td className="text-slate-500 whitespace-nowrap">{row.department}</td>
                <td className="text-slate-500 whitespace-nowrap">{row.manager}</td>
                <td className="max-w-[180px] truncate">{row.goalTitle}</td>
                <td>{row.uom}</td>
                <td className="font-semibold">{row.target}</td>
                {(['q1Score','q2Score','q3Score','q4Score'] as const).map((k) => (
                  <td key={k}>
                    {row[k] != null ? (
                      <span className={`font-semibold ${row[k] >= 80 ? 'text-success-400' : row[k] >= 60 ? 'text-warning-400' : 'text-danger-400'}`}>
                        {row[k].toFixed(0)}%
                      </span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                ))}
                <td><span className="badge badge-draft">{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
