interface BadgeProps {
  children: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'slate';
  className?: string;
}

const colorMap = {
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  green:  'bg-success-500/10 text-success-600 dark:text-success-400',
  red:    'bg-danger-500/10 text-danger-600 dark:text-danger-400',
  yellow: 'bg-warning-500/10 text-warning-600 dark:text-warning-400',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  slate:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export default function Badge({ children, color = 'blue', className = '' }: BadgeProps) {
  return <span className={`badge ${colorMap[color]} ${className}`}>{children}</span>;
}
