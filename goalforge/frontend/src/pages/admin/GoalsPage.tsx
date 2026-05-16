import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsService } from '@/services/services';
import { PageHeader, Spinner, ErrorState, EmptyState, StatusBadge } from '@/components/common';
import { Unlock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminGoalsPage() {
  const qc = useQueryClient();
  const { data: goals = [], isLoading, error, refetch } = useQuery({ queryKey: ['all-goals'], queryFn: goalsService.getAll });

  const unlockMut = useMutation({
    mutationFn: (id: string) => goalsService.unlock(id),
    onSuccess: () => { toast.success('Goal unlocked'); qc.invalidateQueries({ queryKey: ['all-goals'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;
  if (error) return <ErrorState onRetry={refetch}/>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="All Goals" subtitle={`${goals.length} goals across the organisation`}/>
      {goals.length === 0 ? (
        <EmptyState title="No goals yet"/>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Goal</th><th>Employee</th><th>Dept</th><th>Thrust Area</th><th>Weight</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {goals.map((g) => (
                <tr key={g.id}>
                  <td><p className="font-medium text-slate-800 dark:text-white max-w-[200px] truncate">{g.title}</p></td>
                  <td className="text-slate-500">{g.user?.name}</td>
                  <td className="text-slate-500 text-xs">{g.user?.department}</td>
                  <td className="text-xs text-slate-500">{g.thrustArea}</td>
                  <td className="font-semibold">{g.weightage}%</td>
                  <td><StatusBadge status={g.status}/></td>
                  <td>
                    {g.status === 'LOCKED' && (
                      <button onClick={() => unlockMut.mutate(g.id)} disabled={unlockMut.isPending}
                        className="btn-secondary btn btn-sm gap-1"><Unlock size={12}/>Unlock</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
