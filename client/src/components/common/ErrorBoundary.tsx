import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center p-6">
          <div className="card max-w-md w-full p-8 text-center animate-fade-in">
            <div className="w-16 h-16 bg-danger-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-danger-500" />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-800 dark:text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
              An unexpected error occurred in the application. We've been notified and are looking into it.
            </p>
            
            {import.meta.env.DEV && (
              <div className="mb-8 p-4 bg-surface-100 dark:bg-surface-800 rounded-xl text-left overflow-auto max-h-40">
                <p className="text-xs font-mono text-danger-400 break-all">
                  {this.state.error?.toString()}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="btn-primary btn w-full py-3 gap-2"
            >
              <RefreshCw size={18} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
