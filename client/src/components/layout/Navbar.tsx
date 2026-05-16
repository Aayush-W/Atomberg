import { useState } from 'react';
import { Bell, Sun, Moon, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/services/services';
import { format } from 'date-fns';

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const { darkMode, toggleDarkMode } = useUIStore();
  const { notifications, unreadCount, setNotifications, markRead, markAllRead } =
    useNotificationStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const qc = useQueryClient();

  useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const data = await notificationsService.getAll();
      setNotifications(data);
      return data;
    },
    refetchInterval: 30_000,
  });

  const markReadMut = useMutation({
    mutationFn: notificationsService.markRead,
    onSuccess: (_, id) => { markRead(id); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const markAllMut = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => { markAllRead(); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 z-20 flex-shrink-0">
      {/* Breadcrumb placeholder */}
      <div />

      <div className="flex items-center gap-3">
        {/* Dark mode */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((p) => !p)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-danger-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 card shadow-xl z-50 animate-fade-in overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 dark:border-surface-800">
                <span className="text-sm font-semibold text-slate-800 dark:text-white">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllMut.mutate()}
                    className="text-xs text-brand-500 hover:text-brand-400 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center py-8 text-sm text-slate-400">No notifications</p>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markReadMut.mutate(n.id)}
                      className={`px-4 py-3 border-b border-surface-100 dark:border-surface-800 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors ` +
                        (!n.isRead ? 'bg-brand-50 dark:bg-brand-900/10' : '')}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && (
                          <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-surface-200 dark:border-surface-700">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0) ?? '?'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-none">
              {user?.name}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{user?.department}</p>
          </div>
          <ChevronDown size={14} className="text-slate-400" />
        </div>
      </div>
    </header>
  );
}
