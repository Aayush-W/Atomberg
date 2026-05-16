import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Target, CheckSquare, History, Users,
  ClipboardCheck, Share2, BarChart2, Network,
  Settings, RefreshCw, Calendar, Shield, FileText,
  AlertTriangle, Brain, LogOut, Zap,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import type { Role } from '@/types';
import { authService } from '@/services/services';
import toast from 'react-hot-toast';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const navItems: NavItem[] = [
  // Employee
  { to: '/employee/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['EMPLOYEE'] },
  { to: '/employee/goals',     label: 'My Goals',   icon: <Target size={18} />,          roles: ['EMPLOYEE'] },
  { to: '/employee/checkin',   label: 'Check-In',   icon: <CheckSquare size={18} />,      roles: ['EMPLOYEE'] },
  { to: '/employee/history',   label: 'History',    icon: <History size={18} />,          roles: ['EMPLOYEE'] },

  // Manager
  { to: '/manager/dashboard',       label: 'Dashboard',        icon: <LayoutDashboard size={18} />, roles: ['MANAGER'] },
  { to: '/manager/approvals',       label: 'Approvals',        icon: <ClipboardCheck size={18} />,  roles: ['MANAGER'] },
  { to: '/manager/team',            label: 'My Team',          icon: <Users size={18} />,            roles: ['MANAGER'] },
  { to: '/manager/shared-goals',    label: 'Shared Goals',     icon: <Share2 size={18} />,           roles: ['MANAGER'] },
  { to: '/manager/analytics',       label: 'Analytics',        icon: <BarChart2 size={18} />,        roles: ['MANAGER'] },
  { to: '/manager/dependency-graph',label: 'Dependency Graph', icon: <Network size={18} />,          roles: ['MANAGER'] },

  // Admin
  { to: '/admin/dashboard',        label: 'Dashboard',       icon: <LayoutDashboard size={18} />, roles: ['ADMIN'] },
  { to: '/admin/cycles',           label: 'Cycles',          icon: <Calendar size={18} />,         roles: ['ADMIN'] },
  { to: '/admin/users',            label: 'Users',           icon: <Users size={18} />,             roles: ['ADMIN'] },
  { to: '/admin/goals',            label: 'All Goals',       icon: <Target size={18} />,            roles: ['ADMIN'] },
  { to: '/admin/escalations',      label: 'Escalations',     icon: <AlertTriangle size={18} />,    roles: ['ADMIN'] },
  { to: '/admin/reports',          label: 'Reports',         icon: <FileText size={18} />,          roles: ['ADMIN'] },
  { to: '/admin/audit',            label: 'Audit Log',       icon: <Shield size={18} />,            roles: ['ADMIN'] },
  { to: '/admin/ml-insights',      label: 'ML Insights',     icon: <Brain size={18} />,             roles: ['ADMIN'] },
  { to: '/admin/dependency-graph', label: 'Dependency Graph',icon: <Network size={18} />,           roles: ['ADMIN'] },
];

const DEMO_ACCOUNTS = [
  { label: 'Admin',    email: 'admin@goalforge.com',    password: 'Admin@123',    role: 'ADMIN' as Role },
  { label: 'Manager 1', email: 'manager1@goalforge.com', password: 'Manager@123', role: 'MANAGER' as Role },
  { label: 'Employee 1', email: 'emp1@goalforge.com',    password: 'Employee@123', role: 'EMPLOYEE' as Role },
];

export default function Sidebar() {
  const { user, setAuth, logout } = useAuthStore();
  const navigate = useNavigate();

  const filtered = navItems.filter((item) => user && item.roles.includes(user.role));

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    logout();
    navigate('/login');
  };

  const switchRole = async (email: string, password: string) => {
    try {
      const data = await authService.login(email, password);
      setAuth(data.user, data.accessToken, data.refreshToken);
      const map: Record<Role, string> = {
        ADMIN: '/admin/dashboard', MANAGER: '/manager/dashboard', EMPLOYEE: '/employee/dashboard',
      };
      navigate(map[data.user.role]);
      toast.success(`Switched to ${data.user.name}`);
    } catch {
      toast.error('Failed to switch role');
    }
  };

  return (
    <aside className="sidebar select-none">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-white font-display font-bold text-lg">GoalForge</span>
        </div>
        {user && (
          <div className="mt-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-brand-600/30 text-brand-300">
                {user.role}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <div className="space-y-0.5">
          {filtered.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ` +
                (isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-surface-800')
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Demo Role Switcher */}
      <div className="px-3 pb-2 border-t border-surface-800 pt-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold px-2 mb-2 flex items-center gap-1.5">
          <RefreshCw size={10} /> Demo Switcher
        </p>
        <div className="space-y-1">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              onClick={() => switchRole(acc.email, acc.password)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all ` +
                (user?.email === acc.email
                  ? 'bg-brand-600/20 text-brand-300'
                  : 'text-slate-400 hover:bg-surface-800 hover:text-white')}
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="px-3 pb-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-400 hover:text-danger-400 hover:bg-danger-500/10 text-sm font-medium transition-all"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
