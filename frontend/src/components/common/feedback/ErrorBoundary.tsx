import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import './ErrorBoundary.css';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
  onReset?: () => void;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, {
      tags: { boundary: this.props.name ?? 'unnamed' },
      contexts: { react: { componentStack: info.componentStack } },
    });
  }

  handleRetry = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const title = this.props.name ? `Something went wrong in ${this.props.name}` : 'Something went wrong';
      return (
        <div className="error-boundary">
          <p className="error-boundary__title">{title}</p>
          <p className="error-boundary__message">{this.state.error?.message ?? 'An unexpected error occurred'}</p>
          <Button variant="outline" size="sm" onClick={this.handleRetry}>
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
