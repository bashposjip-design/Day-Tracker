import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { formatFriendlyDataError } from '../lib/firestoreService';

interface ErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const friendlyMessage = formatFriendlyDataError(this.state.error);
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] dark:bg-[#121514] px-6 py-12">
          <div className="max-w-md w-full rounded-2xl border border-[#E7E5DF] dark:border-[#262B28] bg-white dark:bg-[#181C1A] p-8 text-center">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-semibold text-[#1C1F1D] dark:text-[#F2F4F2]">
              Something interrupted your workspace
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#5C645E] dark:text-[#9CA59E] break-words">
              {friendlyMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#4A6B53] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3D5A45] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A6B53]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Reload Workspace</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
