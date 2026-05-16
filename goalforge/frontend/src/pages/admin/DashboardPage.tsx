import { useQuery } from '@tanstack/react-query';
import { reportsService, usersService, goalsService } from '@/services/services';
import { StatCard, PageHeader, Spinner, ErrorState } from '@/components/common';
import { Users, Target, CheckSquare, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const { data: users = [], isLoading: uLoading } = useQuery({ queryKey: ['all-users'], queryFn: usersService.getAll });
  const { data: allGoals = [], isLoading: gLoading, error, refetch } = useQuery({ queryKey: ['all-goals'], queryFn: goalsService.getAll });
  const { data: completionDash = [] } = useQuery({ queryKey: ['completion-dashboard'], queryFn: reportsService.getCompletionDashboard });

  if (uLoading || gLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;
  if (error) return <ErrorState onRetry={refetch}/>;

  const employees = users.filter((u) => u.role === 'EMPLOYEE');
  const submitted = allGoals.filter((g) => g.status !== 'DRAFT');
  const goalSetPct = employees.length ? Math.round((submitted.length > 0 ? employees.filter((e) => allGoals.some((g) => g.userId === e.id && g.status !== 'DRAFT')).length : 0) / employees.length * 100) : 0;
  const checkedInPct = completionDash.length ? Math.round(completionDash.filter((r: any) => r.q1Done).length / completionDash.length * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Admin Dashboard" subtitle="Organisation-wide overview"/>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={employees.length} icon={<Users size={18}/>} color="brand"/>
        <StatCard title="Goals Set %" value={`${goalSetPct}%`} icon={<Target size={18}/>} color="success"/>
        <StatCard title="Q1 Check-ins %" value={`${checkedInPct}%`} icon={<CheckSquare size={18}/>} color="warning"/>
        <StatCard title="Total Goals" value={allGoals.length} icon={<AlertTriangle size={18}/>} color="slate"/>
      </div>

      {/* Completion dashboard */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-800">
          <h2 className="font-semibold text-slate-800 dark:text-white">Completion Dashboard</h2>
          <p className="text-xs text-slate-400 mt-0.5">Real-time goal submission & check-in status per employee</p>
        </div>
        <div className="table-container rounded-none border-0">
          <table className="data-table">
            <thead>
              <tr><th>Employee</th><th>Manager</th><th>Goals Submitted</th><th>Goals Approved</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th></tr>
            </thead>
            <tbody>
              {completionDash.slice(0, 20).map((row: any, i: number) => (
                <tr key={i}>
                  <td className="font-medium text-slate-800 dark:text-white">{row.employeeName}</td>
                  <td className="text-slate-500">{row.manager}</td>
                  {(['goalsSubmitted','goalsApproved','q1Done','q2Done','q3Done','q4Done'] as const).map((k) => (
                    <td key={k}><span className={`text-lg ${row[k] ? 'text-success-500' : 'text-slate-300 dark:text-slate-600'}`}>{row[k] ? '✓' : '✗'}</span></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
