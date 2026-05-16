import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';
import { useUIStore } from './stores/uiStore';

// Apply dark mode on initial load
const { darkMode } = useUIStore.getState();
if (darkMode) document.documentElement.classList.add('dark');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-surface-950">
          <div className="text-brand-500 text-xl font-display font-bold animate-pulse">GoalForge</div>
        </div>}>
          <App />
        </Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'dark:bg-surface-800 dark:text-slate-100 text-sm font-medium',
            duration: 4000,
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
