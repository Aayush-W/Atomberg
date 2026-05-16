import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cyclesService } from '@/services/services';
import { PageHeader, Spinner, ErrorState, Modal } from '@/components/common';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Cycle } from '@/types';

export default function AdminCyclesPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Cycle>>({});

  const { data: cycles = [], isLoading, error, refetch } = useQuery({ queryKey: ['cycles'], queryFn: cyclesService.getAll });

  const createMut = useMutation({
    mutationFn: () => cyclesService.create(form),
    onSuccess: () => { toast.success('Cycle created'); qc.invalidateQueries({ queryKey: ['cycles'] }); setShowAdd(false); setForm({}); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: () => cyclesService.update(editId!, form),
    onSuccess: () => { toast.success('Cycle updated'); qc.invalidateQueries({ queryKey: ['cycles'] }); setEditId(null); setForm({}); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;
  if (error) return <ErrorState onRetry={refetch}/>;

  const openEdit = (c: Cycle) => { setEditId(c.id); setForm({ ...c }); };

  const FIELDS = [
    ['name', 'Cycle Name', 'text'], ['startDate', 'Start Date', 'date'], ['endDate', 'End Date', 'date'],
    ['goalSettingOpen', 'Goal Setting Opens', 'date'], ['q1Open', 'Q1 Opens', 'date'],
    ['q2Open', 'Q2 Opens', 'date'], ['q3Open', 'Q3 Opens', 'date'], ['q4Open', 'Q4 Opens', 'date'],
  ];

  const CycleForm = () => (
    <div className="space-y-3">
      {FIELDS.map(([k, l, t]) => (
        <div key={k}>
          <label className="label">{l}</label>
          <input type={t} value={(form as any)[k] ? (t === 'date' ? (form as any)[k].slice(0, 10) : (form as any)[k]) : ''}
            onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} className="input"/>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="bypass" checked={!!(form as any).bypassWindow} onChange={(e) => setForm((p) => ({ ...p, bypassWindow: e.target.checked }))} className="rounded"/>
        <label htmlFor="bypass" className="text-sm text-slate-600 dark:text-slate-300">Bypass check-in window enforcement</label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Cycle Management" subtitle="Manage performance cycles and window dates"
        actions={<button onClick={() => { setShowAdd(true); setForm({}); }} className="btn-primary btn gap-2"><Plus size={16}/>New Cycle</button>}/>

      <div className="space-y-3">
        {cycles.map((c) => (
          <div key={c.id} className="card p-5 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-slate-800 dark:text-white">{c.name}</p>
                {c.isActive && <span className="badge bg-success-500/10 text-success-600 dark:text-success-400">Active</span>}
                {c.bypassWindow && <span className="badge bg-warning-500/10 text-warning-600">Window Bypassed</span>}
              </div>
              <p className="text-xs text-slate-400">
                {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()} ·
                Q1: {new Date(c.q1Open).toLocaleDateString()} · Q2: {new Date(c.q2Open).toLocaleDateString()} ·
                Q3: {new Date(c.q3Open).toLocaleDateString()} · Q4: {new Date(c.q4Open).toLocaleDateString()}
              </p>
            </div>
            <button onClick={() => openEdit(c)} className="btn-secondary btn btn-sm">Edit</button>
          </div>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Cycle"
        footer={<><button className="btn-secondary btn btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn-primary btn btn-sm" onClick={() => createMut.mutate()} disabled={createMut.isPending}>{createMut.isPending ? 'Creating…' : 'Create'}</button></>}>
        <CycleForm/>
      </Modal>

      <Modal open={!!editId} onClose={() => setEditId(null)} title="Edit Cycle"
        footer={<><button className="btn-secondary btn btn-sm" onClick={() => setEditId(null)}>Cancel</button>
          <button className="btn-primary btn btn-sm" onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>{updateMut.isPending ? 'Saving…' : 'Save'}</button></>}>
        <CycleForm/>
      </Modal>
    </div>
  );
}
