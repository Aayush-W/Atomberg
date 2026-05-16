interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'brand' | 'success' | 'warning' | 'danger' | 'slate';
  className?: string;
}

const colorMap = {
  brand:   'bg-brand-500/10 text-brand-600 dark:text-brand-400',
  success: 'bg-success-500/10 text-success-600 dark:text-success-400',
  warning: 'bg-warning-500/10 text-warning-600 dark:text-warning-400',
  danger:  'bg-danger-500/10 text-danger-600 dark:text-danger-400',
  slate:   'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

export default function StatCard({
  title, value, subtitle, icon, trend, color = 'brand', className = '',
}: StatCardProps) {
  const trendUp = trend && trend.value >= 0;
  return (
    <div className={`card p-5 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        {icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <p className="text-3xl font-display font-bold text-slate-800 dark:text-white">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-success-500' : 'text-danger-500'}`}>
          <span>{trendUp ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value)}%</span>
          <span className="text-slate-400 font-normal">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
