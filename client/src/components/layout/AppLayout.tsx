import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useUIStore } from '@/stores/uiStore';
import useMediaQuery from '@/hooks/useMediaQuery';

export default function AppLayout() {
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    if (isDesktop && mobileSidebarOpen) {
      setMobileSidebarOpen(false);
    }
  }, [isDesktop, mobileSidebarOpen, setMobileSidebarOpen]);

  return (
    <div className="flex min-h-screen bg-surface-50 dark:bg-surface-950">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-[260px]">
        <Navbar />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 lg:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
