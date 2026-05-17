import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div
        className={`relative w-full max-h-[min(88vh,42rem)] ${sizeMap[size]} card shadow-2xl animate-fade-in`}
      >
        <div className="flex items-center justify-between border-b border-surface-100 px-4 py-4 dark:border-surface-800 sm:px-5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[calc(min(88vh,42rem)-8rem)] overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-surface-100 px-4 py-4 dark:border-surface-800 sm:flex-row sm:justify-end sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
