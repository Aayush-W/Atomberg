import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { usersService, goalsService } from '@/services/services';
import { PageHeader, Spinner, ErrorState } from '@/components/common';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { UoMType } from '@/types';

const THRUST_AREAS = ['Innovation', 'Revenue Growth', 'Operational Excellence'];
const UOM_TYPES: UoMType[] = ['MIN', 'MAX', 'TIMELINE', 'ZERO'];

export default function SharedGoalsPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [form, setForm] = useState({ thrustArea: '', title: '', description: '', uomType: 'MIN' as UoMType, target: 0 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: team = [], isLoading } = useQuery({ 
    queryKey: ['team', user?.id], 
    queryFn: () => usersService.getTeam(user?.id ?? ''),
    enabled: !!user?.id
  });
  const { data: teamGoals = [] } = useQuery({ queryKey: ['team-goals'], queryFn: goalsService.getTeam });

  const pushMut = useMutation({
    mutationFn: () => goalsService.pushShared({ ...form, userIds: selectedIds }),
    onSuccess: () => {
      toast.success('Shared goal pushed to team');
      qc.invalidateQueries({ queryKey: ['team-goals'] });
      setSelectedIds([]);
      setForm({ thrustArea: '', title: '', description: '', uomType: 'MIN', target: 0 });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });

  if (!user || isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;

  const toggleUser = (id: string) => setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <PageHeader title="Shared Goals" subtitle="Push a departmental KPI to multiple team members"/>

      <div className="card space-y-5">
        <div>
          <label className="label">Thrust Area</label>
          <select value={form.thrustArea} onChange={(e) => setForm((p) => ({ ...p, thrustArea: e.target.value }))} className="input">
            <option value="">Select…</option>
            {THRUST_AREAS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Goal Title</label>
          <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="input" placeholder="KPI title…"/>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="input resize-none"/>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">UoM Type</label>
            <select value={form.uomType} onChange={(e) => setForm((p) => ({ ...p, uomType: e.target.value as UoMType }))} className="input">
              {UOM_TYPES.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Target</label>
            <input type="number" value={form.target} onChange={(e) => setForm((p) => ({ ...p, target: parseFloat(e.target.value) || 0 }))} className="input"/>
          </div>
        </div>

        <div>
          <label className="label">Push to Employees</label>
          <div className="space-y-2">
            {team.map((m) => {
              const goalCount = teamGoals.filter((g) => g.userId === m.id).length;
              const wouldExceed = selectedIds.includes(m.id) && goalCount + 1 > 8;
              return (
                <div key={m.id} onClick={() => toggleUser(m.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedIds.includes(m.id) ? 'border-brand-500 bg-brand-500/10' : 'border-surface-200 dark:border-surface-700 hover:border-brand-400'}`}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedIds.includes(m.id) ? 'bg-brand-600 border-brand-600' : 'border-slate-400'}`}>
                    {selectedIds.includes(m.id) && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">{m.name.charAt(0)}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{m.name}</p>
                    <p className="text-xs text-slate-400">{goalCount}/8 goals</p>
                  </div>
                  {goalCount >= 7 && (
                    <div className="flex items-center gap-1 text-warning-400 text-xs"><AlertCircle size={12}/> Near limit</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-surface-100 dark:border-surface-800">
          <button onClick={() => pushMut.mutate()} disabled={selectedIds.length === 0 || !form.title || pushMut.isPending} className="btn-primary btn">
            {pushMut.isPending ? 'Pushing…' : `Push to ${selectedIds.length} Employee(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
