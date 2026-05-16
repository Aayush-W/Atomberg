import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { goalsService, aiService, mlService } from '@/services/services';
import { PageHeader } from '@/components/common';
import type { UoMType, SmartRewriteResponse, ThrustAreaSuggestion } from '@/types';

const THRUST_AREAS = ['Innovation', 'Revenue Growth', 'Operational Excellence'];
const UOM_TYPES: UoMType[] = ['MIN', 'MAX', 'TIMELINE', 'ZERO'];
const UOM_TOOLTIPS: Record<UoMType, string> = {
  MIN: 'Higher = better (e.g. sales)',
  MAX: 'Lower = better (e.g. defects)',
  TIMELINE: 'Must complete by date',
  ZERO: 'Binary achieved/not',
};
const SMART_LABELS = ['Specific', 'Measurable', 'Achievable', 'Relevant', 'Time-Bound'];
const SMART_KEYS = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound'] as const;

const schema = z.object({
  thrustArea: z.string().min(1),
  title: z.string().min(5).max(150),
  description: z.string().min(20).max(500),
  uomType: z.enum(['MIN', 'MAX', 'TIMELINE', 'ZERO']),
  target: z.number().positive().optional(),
  targetDate: z.string().optional(),
  weightage: z.number().min(10).max(80),
});
type FormData = z.infer<typeof schema>;

export default function NewGoalPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [smartData, setSmartData] = useState<SmartRewriteResponse | null>(null);
  const [thrustHint, setThrustHint] = useState<ThrustAreaSuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: existingGoals = [] } = useQuery({ queryKey: ['my-goals'], queryFn: goalsService.getMine });
  const currentTotal = existingGoals.reduce((s, g) => s + g.weightage, 0);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { uomType: 'MIN', weightage: 20 },
  });

  const [title, description, thrustArea, uomType, weightage] = watch(['title', 'description', 'thrustArea', 'uomType', 'weightage']);

  // AI debounce
  useEffect(() => {
    if (!title || title.length < 10 || !description || description.length < 20) return;
    const t = setTimeout(async () => {
      setAiLoading(true);
      try { setSmartData(await aiService.smartRewrite(thrustArea || '', title, description)); }
      catch {/* graceful */} finally { setAiLoading(false); }
    }, 2000);
    return () => clearTimeout(t);
  }, [title, description, thrustArea]);

  // ML thrust suggestion
  useEffect(() => {
    if (!title || title.length < 10) return;
    const t = setTimeout(async () => {
      try { setThrustHint(await mlService.suggestThrustArea(title, description || '')); }
      catch {/* graceful */}
    }, 1500);
    return () => clearTimeout(t);
  }, [title, description]);

  const createMut = useMutation({
    mutationFn: (data: FormData) => goalsService.create({ ...data, target: uomType === 'ZERO' ? 0 : data.target }),
    onSuccess: () => { toast.success('Goal created!'); qc.invalidateQueries({ queryKey: ['my-goals'] }); navigate('/employee/goals'); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed to create goal'),
  });

  const newTotal = currentTotal + (weightage || 0);

  return (
    <div className="max-w-5xl space-y-6 animate-fade-in">
      <PageHeader title="New Goal" subtitle="Create a SMART goal for the active cycle"/>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="xl:col-span-2 card space-y-5">
          <div>
            <label className="label">Thrust Area</label>
            <select {...register('thrustArea')} className="input">
              <option value="">Select…</option>
              {THRUST_AREAS.map((t) => <option key={t}>{t}</option>)}
            </select>
            {thrustHint && (
              <div className="mt-1.5 flex items-center gap-2 text-xs text-brand-400">
                <Sparkles size={12}/>
                ML suggests: <strong>{thrustHint.suggestedThrustArea}</strong> ({(thrustHint.confidence * 100).toFixed(0)}%)
                <button type="button" onClick={() => setValue('thrustArea', thrustHint.suggestedThrustArea)} className="underline">Apply</button>
              </div>
            )}
            {errors.thrustArea && <p className="text-danger-400 text-xs mt-1">{errors.thrustArea.message}</p>}
          </div>
          <div>
            <label className="label">Goal Title</label>
            <input {...register('title')} className="input" placeholder="e.g., Increase quarterly sales by 15%"/>
            {errors.title && <p className="text-danger-400 text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...register('description')} rows={3} className="input resize-none" placeholder="Describe how you will achieve this…"/>
            {errors.description && <p className="text-danger-400 text-xs mt-1">{errors.description.message}</p>}
          </div>
          <div>
            <label className="label">Unit of Measurement</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {UOM_TYPES.map((u) => (
                <button key={u} type="button" onClick={() => setValue('uomType', u)}
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all text-left ${uomType === u ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-surface-200 dark:border-surface-700 text-slate-500 hover:border-brand-400'}`}>
                  <div className="font-bold text-sm mb-1">{u}</div>
                  <div>{UOM_TOOLTIPS[u]}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {uomType !== 'ZERO' && (
              <div>
                <label className="label">Target Value</label>
                <input {...register('target', { valueAsNumber: true })} type="number" step="any" className="input" placeholder="0"/>
                {errors.target && <p className="text-danger-400 text-xs mt-1">{errors.target.message}</p>}
              </div>
            )}
            {uomType === 'TIMELINE' && (
              <div>
                <label className="label">Target Date</label>
                <input {...register('targetDate')} type="date" className="input"/>
              </div>
            )}
            <div>
              <label className="label">Weightage (%)</label>
              <input {...register('weightage', { valueAsNumber: true })} type="number" min="10" max="80" className="input"/>
              <p className={`text-xs mt-1 ${newTotal > 100 ? 'text-danger-400' : 'text-slate-400'}`}>
                Running total: {newTotal}%{newTotal > 100 && ' ⚠ Exceeds 100%'}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-surface-100 dark:border-surface-800">
            <button type="button" onClick={() => navigate('/employee/goals')} className="btn-secondary btn">Cancel</button>
            <button type="submit" disabled={isSubmitting || createMut.isPending} className="btn-primary btn">
              {createMut.isPending ? <><Loader2 size={14} className="animate-spin"/>Creating…</> : <><Check size={14}/>Create Goal</>}
            </button>
          </div>
        </form>

        {/* AI Coach panel */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-brand-400"/>
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">AI SMART Coach</h3>
            {aiLoading && <Loader2 size={14} className="animate-spin text-brand-400 ml-auto"/>}
          </div>
          {!smartData && !aiLoading && <p className="text-xs text-slate-400">Type your title and description — AI suggestions appear here.</p>}
          {smartData && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">SMART Scores</p>
                {SMART_KEYS.map((key, i) => (
                  <div key={key} className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs w-20 text-slate-500">{SMART_LABELS[i]}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-surface-200 dark:bg-surface-700">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${(smartData.scores[key] / 5) * 100}%` }}/>
                    </div>
                    <span className="text-xs font-bold text-slate-500 w-6 text-right">{smartData.scores[key]}/5</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">AI Version</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 bg-surface-50 dark:bg-surface-800 rounded-xl p-3 leading-relaxed">{smartData.smartVersion}</p>
                <button type="button" onClick={() => { setValue('title', smartData.smartVersion.split('.')[0].substring(0,150)); setValue('description', smartData.smartVersion.substring(0,500)); toast.success('Applied!'); }}
                  className="btn-primary btn btn-sm w-full mt-2"><Check size={12}/>Use AI Version</button>
              </div>
              {smartData.suggestions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Suggestions</p>
                  {smartData.suggestions.map((s, i) => (
                    <div key={i} className="flex gap-1.5 mb-1 text-xs text-slate-500">
                      <AlertCircle size={11} className="text-warning-400 flex-shrink-0 mt-0.5"/>{s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
