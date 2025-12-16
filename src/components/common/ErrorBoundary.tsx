import { Component, ReactNode } from 'react';

import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('[ErrorBoundary] Error caught:', error);
    logger.error('[ErrorBoundary] Error info:', errorInfo);
    logger.error('[ErrorBoundary] Error stack:', error.stack);
    
    // Store error info for display
    this.setState({ errorInfo });
    
    // Log component stack in development
    if (import.meta.env.DEV) {
      logger.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    // Auto-retry for certain errors (e.g., chunk loading failures)
    if (error.message.includes('Loading chunk') || error.message.includes('Failed to fetch dynamically imported module')) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  scheduleRetry = () => {
    const { retryCount } = this.state;
    const MAX_RETRIES = 3;

    if (retryCount < MAX_RETRIES) {
      this.retryTimeoutId = setTimeout(() => {
        logger.warn(`[ErrorBoundary] Retrying after error (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
        this.setState((prev) => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: prev.retryCount + 1,
        }));
      }, 1000 * (retryCount + 1)); // Exponential backoff
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, retryCount: 0 });
    window.location.href = '/';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#242426] p-4 animate-fade-in">
          <div className="max-w-md animate-scale-in rounded-xl border border-red-500/20 bg-[#1A1A1C] p-6 text-center shadow-2xl">
            <h1 className="mb-2 text-2xl font-bold text-red-400">Something went wrong</h1>
            <p className="mb-4 text-white/70">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            {import.meta.env.DEV && this.state.error?.stack && (
              <pre className="mb-4 max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-left text-xs text-white/70 animate-fade-in">
                {this.state.error.stack}
              </pre>
            )}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="rounded-lg bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-200 hover:scale-105 hover:bg-[#C3ADD9] active:scale-95"
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReset}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/70 transition-all duration-200 hover:scale-105 hover:bg-white/10 active:scale-95"
                >
                  Go Home
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/70 transition-all duration-200 hover:scale-105 hover:bg-white/10 active:scale-95"
                >
                  Reload Page
                </button>
              </div>
              {this.state.retryCount > 0 && (
                <p className="text-xs text-white/50 text-center animate-fade-in">
                  Retry attempt: {this.state.retryCount}/3
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

