import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React Component Tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-6 text-[#0D3B4C]">
          <div className="report-card max-w-md w-full p-6 text-center space-y-4 shadow-xl">
            <h2 className="text-xl font-bold font-serif text-rose-700">Application Error</h2>
            <p className="text-xs text-[#57656E] leading-relaxed">
              An unexpected error occurred during rendering:
            </p>
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-mono text-rose-800 text-left overflow-x-auto">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="cta-button w-full justify-center text-xs"
            >
              Reload GiveChain Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
