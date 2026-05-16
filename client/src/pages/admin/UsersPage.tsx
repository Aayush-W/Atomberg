import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/services';
import { PageHeader, Spinner, ErrorState, StatusBadge, Modal } from '@/components/common';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Role } from '@/types';

const ROLES: Role[] = ['EMPLOYEE', 'MANAGER', 'ADMIN'];

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: 'Employee@123', role: 'EMPLOYEE' as Role, department: '', managerId: '' });

  const { data: users = [], isLoading, error, refetch } = useQuery({ queryKey: ['all-users'], queryFn: usersService.getAll });

  const createMut = useMutation({
    mutationFn: () => usersService.create(form),
    onSuccess: () => { toast.success('User created'); qc.invalidateQueries({ queryKey: ['all-users'] }); setShowAdd(false); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;
  if (error) return <ErrorState onRetry={refetch}/>;

  const filtered = users.filter((u) =>
    (!search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) &&
    (!roleFilter || u.role === roleFilter)
  );

  const managers = users.filter((u) => u.role === 'MANAGER' || u.role === 'ADMIN');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="User Management" subtitle={`${users.length} users`}
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary btn gap-2"><Plus size={16}/>Add User</button>}/>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className="input pl-9"/>
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | '')} className="input w-auto">
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Manager</th><th>Created</th></tr></thead>
          <tbody>
            {filtered.map((u) => {
              const mgr = users.find((x) => x.id === u.managerId);
              return (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">{u.name.charAt(0)}</div>
                      <span className="font-medium text-slate-800 dark:text-white">{u.name}</span>
                    </div>
                  </td>
                  <td className="text-slate-500">{u.email}</td>
                  <td><StatusBadge status={u.role}/></td>
                  <td className="text-slate-500">{u.department}</td>
                  <td className="text-slate-500">{mgr?.name ?? '—'}</td>
                  <td className="text-slate-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New User"
        footer={<>
          <button className="btn-secondary btn btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn-primary btn btn-sm" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            {createMut.isPending ? 'Creating…' : 'Create User'}
          </button>
        </>}>
        <div className="space-y-4">
          {[['name','Name','text'],['email','Email','email'],['password','Temp Password','password'],['department','Department','text']].map(([k,l,t]) => (
            <div key={k}>
              <label className="label">{l}</label>
              <input type={t} value={(form as any)[k]} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} className="input"/>
            </div>
          ))}
          <div>
            <label className="label">Role</label>
            <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))} className="input">
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Manager</label>
            <select value={form.managerId} onChange={(e) => setForm((p) => ({ ...p, managerId: e.target.value }))} className="input">
              <option value="">None</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
