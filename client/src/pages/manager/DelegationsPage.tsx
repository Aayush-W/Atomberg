import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { delegationsService, usersService } from '@/services/services';
import { Modal, PageHeader, Spinner, ErrorState } from '@/components/common';

export default function DelegationsPage() {
  const user = useAuthStore((state) => state.user);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    delegateManagerId: '',
    startsAt: '',
    endsAt: '',
    reason: ''
  });

  const { data: managers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['managers'],
    queryFn: usersService.getManagers,
    enabled: !!user
  });
  const { data: teamManagers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['delegations'],
    queryFn: delegationsService.getAll
  });

  const availableManagers = useMemo(
    () => managers.filter((entry) => entry.role === 'MANAGER' && entry.id !== user?.id),
    [managers, user?.id]
  );

  const createMut = useMutation({
    mutationFn: () => delegationsService.create(form),
    onSuccess: () => {
      toast.success('Delegation created');
      setOpen(false);
      setForm({ delegateManagerId: '', startsAt: '', endsAt: '', reason: '' });
      qc.invalidateQueries({ queryKey: ['delegations'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Delegation failed'),
  });

  if (isLoading || usersLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;
  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Approval Delegations"
        subtitle="Temporarily delegate approval rights while you are away"
        actions={<button onClick={() => setOpen(true)} className="btn-primary btn">New Delegation</button>}
      />

      <div className="card p-0 overflow-hidden">
        <div className="table-container rounded-none border-0">
          <table className="data-table">
            <thead>
              <tr><th>Delegator</th><th>Delegate</th><th>Window</th><th>Reason</th><th>Status</th></tr>
            </thead>
            <tbody>
              {teamManagers.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium text-slate-800 dark:text-white">{item.delegatorManager?.name}</td>
                  <td>{item.delegateManager?.name}</td>
                  <td className="text-xs text-slate-500">{new Date(item.startsAt).toLocaleDateString()} - {new Date(item.endsAt).toLocaleDateString()}</td>
                  <td className="text-sm text-slate-500">{item.reason}</td>
                  <td><span className={`badge ${item.isActive ? 'badge-approved' : 'badge-draft'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
              {teamManagers.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">No delegations configured yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create Delegation"
        footer={
          <>
            <button className="btn-secondary btn btn-sm" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary btn btn-sm" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              {createMut.isPending ? 'Saving…' : 'Save Delegation'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Delegate Manager</label>
            <select
              value={form.delegateManagerId}
              onChange={(e) => setForm((prev) => ({ ...prev, delegateManagerId: e.target.value }))}
              className="input"
            >
              <option value="">Select…</option>
              {availableManagers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Starts</label>
              <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Ends</label>
              <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))} rows={3} className="input resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
