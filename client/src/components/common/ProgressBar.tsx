interface ProgressBarProps {
  value: number; // 0–120
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getColor(v: number) {
  if (v >= 80) return 'bg-success-500';
  if (v >= 60) return 'bg-warning-500';
  return 'bg-danger-500';
}

const heightMap = { sm: 'h-1', md: 'h-2', lg: 'h-3' };

export default function ProgressBar({
  value, max = 100, showLabel = false, size = 'md', className = '',
}: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 progress-bar ${heightMap[size]}`}>
        <div
          className={`progress-fill ${getColor(value)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-10 text-right">
          {value.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
