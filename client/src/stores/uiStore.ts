import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  darkMode: boolean;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (v: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      darkMode: false,
      sidebarCollapsed: false,
      mobileSidebarOpen: false,

      toggleDarkMode: () =>
        set((state) => {
          const next = !state.darkMode;
          if (next) document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
          return { darkMode: next };
        }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleMobileSidebar: () =>
        set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
      setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
    }),
    { name: 'goalforge-ui' }
  )
);
