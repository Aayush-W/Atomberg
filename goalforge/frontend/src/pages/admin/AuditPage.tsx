import { useQuery } from '@tanstack/react-query';
import { auditService } from '@/services/services';
import { PageHeader, Spinner, ErrorState } from '@/components/common';
import { format } from 'date-fns';

export default function AdminAuditPage() {
  const { data: logs = [], isLoading, error, refetch } = useQuery({ queryKey: ['audit-log'], queryFn: () => auditService.getAll() });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;
  if (error) return <ErrorState onRetry={refetch}/>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Audit Log" subtitle={`${logs.length} entries`}/>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Field</th><th>Old Value</th><th>New Value</th><th>Goal</th></tr></thead>
          <tbody>
            {logs.map((log: any) => (
              <tr key={log.id}>
                <td className="text-xs text-slate-400 whitespace-nowrap">{format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}</td>
                <td><p className="text-sm font-medium text-slate-800 dark:text-white">{log.user?.name}</p><p className="text-xs text-slate-400">{log.user?.email}</p></td>
                <td><span className="badge badge-submitted">{log.action}</span></td>
                <td className="text-slate-500 text-xs">{log.field ?? '—'}</td>
                <td className="text-danger-400 text-xs max-w-[100px] truncate">{log.oldValue ?? '—'}</td>
                <td className="text-success-400 text-xs max-w-[100px] truncate">{log.newValue ?? '—'}</td>
                <td className="text-slate-500 text-xs max-w-[150px] truncate">{log.goal?.title ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
