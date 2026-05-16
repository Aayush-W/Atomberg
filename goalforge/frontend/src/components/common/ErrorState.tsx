import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-danger-500/10 flex items-center justify-center mb-4">
        <AlertCircle size={24} className="text-danger-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">Error</h3>
      <p className="text-sm text-slate-400 max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 btn-secondary btn flex items-center gap-2 text-sm"
        >
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}
