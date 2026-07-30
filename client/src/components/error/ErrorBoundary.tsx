import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-paper">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-12 w-12 text-ink-300" />
            <h1 className="text-2xl font-medium text-ink-950">Something went wrong</h1>
            <p className="max-w-md text-[15px] text-ink-500">
              We've been notified and are working on it. Please try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-ink-950 px-5 py-2.5 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
