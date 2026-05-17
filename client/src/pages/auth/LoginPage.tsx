import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, MonitorSmartphone, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '@/services/services';
import { useAuthStore } from '@/stores/authStore';
import type { Role } from '@/types';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

const QUICK_LOGINS = [
  { label: 'Admin',      email: 'admin@goalforge.com',     password: 'Admin@123' },
  { label: 'Manager 1',  email: 'manager1@goalforge.com',  password: 'Manager@123' },
  { label: 'Employee 1', email: 'alice@goalforge.com',      password: 'Employee@123' },
];

export default function LoginPage() {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const [showPwd, setShowPwd] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [msProfiles, setMsProfiles] = useState<Array<{ email: string; name: string; role: Role; jobTitle?: string; department: string }>>([]);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const finishLogin = (res: { user: any; accessToken: string; refreshToken: string }) => {
    setAuth(res.user, res.accessToken, res.refreshToken);
    const map: Record<Role, string> = {
      ADMIN: '/admin/dashboard',
      MANAGER: '/manager/dashboard',
      EMPLOYEE: '/employee/dashboard',
    };
    toast.success(`Welcome back, ${res.user.name}!`);
    navigate(map[res.user.role]);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authService.login(data.email, data.password);
      finishLogin(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Invalid credentials');
    }
  };

  const handleMicrosoftEntry = async () => {
    try {
      setMsLoading(true);
      const data = await authService.getMicrosoftProfiles();
      setMsProfiles(data.profiles ?? []);
    } catch {
      toast.error('Microsoft demo profiles are unavailable');
    } finally {
      setMsLoading(false);
    }
  };

  const handleMicrosoftLogin = async (email: string) => {
    try {
      setMsLoading(true);
      const res = await authService.loginWithMicrosoftDemo(email);
      finishLogin(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Microsoft demo sign-in failed');
    } finally {
      setMsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 lg:flex">
      {/* Left — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-brand-950 via-brand-900 to-surface-950 p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-white font-display font-bold text-2xl">GoalForge</span>
        </div>
        <div>
          <h2 className="text-4xl font-display font-bold text-white leading-tight mb-4">
            Intelligent Goal Setting<br />& Tracking for Teams
          </h2>
          <p className="text-brand-300 text-lg leading-relaxed">
            Set SMART goals, track quarterly progress, unlock AI-powered insights, and drive organizational excellence.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { v: '13', l: 'Demo Users' },
              { v: '5',  l: 'AI Features' },
              { v: '4',  l: 'ML Models' },
            ].map(({ v, l }) => (
              <div key={l} className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                <p className="text-3xl font-display font-bold text-white">{v}</p>
                <p className="text-xs text-brand-300 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-brand-400 text-xs">© 2025 GoalForge. Built for Atomberg Hackathon.</p>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 items-start justify-center px-4 py-8 sm:px-6 lg:items-center lg:p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-6 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <span className="text-white font-display font-bold text-xl">GoalForge</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Intelligent goal setting and progress tracking designed to feel clean and comfortable on a phone.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { v: '13', l: 'Demo Users' },
                { v: '5',  l: 'AI Features' },
                { v: '4',  l: 'ML Models' },
              ].map(({ v, l }) => (
                <div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                  <p className="text-2xl font-display font-bold text-white">{v}</p>
                  <p className="mt-1 text-[11px] text-brand-300">{l}</p>
                </div>
              ))}
            </div>
          </div>

          <h1 className="text-2xl font-display font-bold text-white mb-1">Sign in</h1>
          <p className="text-slate-400 text-sm mb-8">Enter your credentials to access your workspace</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label text-slate-400">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@goalforge.com"
                className="input bg-surface-800 border-surface-700 text-white placeholder-slate-500 focus:border-brand-500"
              />
              {errors.email && <p className="text-danger-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label text-slate-400">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input bg-surface-800 border-surface-700 text-white placeholder-slate-500 focus:border-brand-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-danger-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary btn w-full mt-2 py-3"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={handleMicrosoftEntry}
              disabled={msLoading}
              className="btn-secondary btn w-full py-3 gap-2"
            >
              <MonitorSmartphone size={16} />
              {msLoading ? 'Loading Microsoft demo…' : 'Sign in with Microsoft Demo'}
            </button>
          </form>

          {msProfiles.length > 0 && (
            <div className="mt-4 rounded-2xl border border-surface-700 bg-surface-900/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Microsoft Demo Profiles</p>
              <div className="space-y-2">
                {msProfiles.map((profile) => (
                  <button
                    key={profile.email}
                    type="button"
                    onClick={() => handleMicrosoftLogin(profile.email)}
                    className="w-full rounded-xl border border-surface-700 px-3 py-2 text-left hover:border-brand-500 transition-colors"
                  >
                    <p className="text-sm font-medium text-white">{profile.name}</p>
                    <p className="text-xs text-slate-400">{profile.jobTitle} · {profile.department} · {profile.role}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick login */}
          <div className="mt-8">
            <p className="text-slate-500 text-xs text-center mb-3">Quick demo login</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {QUICK_LOGINS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => { setValue('email', acc.email); setValue('password', acc.password); }}
                  className="p-2.5 rounded-xl bg-surface-800 border border-surface-700 hover:border-brand-500 text-slate-300 hover:text-white text-xs font-medium transition-all text-center"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
