import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, LayoutDashboard } from 'lucide-react';

interface Props {
  children: ReactNode;
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppPageErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PAGE_ERROR_BOUNDARY]:', error, errorInfo);
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoBack = () => {
    window.history.back();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full py-12 px-4 flex items-center justify-center animate-page-enter">
          <div className="max-w-xl w-full clay-card rounded-3xl p-8 border border-[#e8beae] bg-[#fbf5f2] shadow-[6px_8px_24px_rgba(196,100,63,0.14)] text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[#f6dfd8] text-[#8a3114] flex items-center justify-center mx-auto border border-[#e8beae] shadow-[inset_1px_1px_3px_rgba(196,100,63,0.15)]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold font-baloo text-[#8a3114]">
                Unable to Display Page
              </h2>
              <p className="text-xs text-[#8a3114]/80 mt-2 leading-relaxed">
                {this.state.error?.message ||
                  'An unexpected rendering issue occurred on this view. You can retry or navigate to another section.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#14776b] hover:bg-[#11655b] text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <button
                type="button"
                onClick={this.handleGoBack}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#e2e8dc] hover:bg-[#dbe2d5] text-[#26301f] text-xs font-semibold rounded-xl border border-[#c5d0be] transition active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#e2e8dc] hover:bg-[#dbe2d5] text-[#26301f] text-xs font-semibold rounded-xl border border-[#c5d0be] transition active:scale-95"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppPageErrorBoundary;
