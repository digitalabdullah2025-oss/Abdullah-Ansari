import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let display = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(display) as { error?: string; operationType?: string; path?: string };
      if (parsed && parsed.error) {
        display = `Database access error (${parsed.operationType || 'read'} on ${parsed.path || 'resource'}): ${parsed.error}`;
      }
    } catch {
      // keep raw message
    }
    return { hasError: true, message: display };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('AF FIXING ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B1F3A] text-white text-sm font-semibold hover:bg-[#122C4F] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload AF FIXING
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
