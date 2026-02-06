import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WarningCircle, ArrowClockwise, House } from '@phosphor-icons/react';
import { Link } from 'wouter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="glass-panel border-red-500/30 rounded-2xl max-w-md w-full">
            <CardContent className="py-8 px-6 text-center space-y-6">
              <div className="mx-auto h-16 w-16 bg-red-500/20 rounded-2xl flex items-center justify-center">
                <WarningCircle className="h-8 w-8 text-red-400" weight="fill" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Something went wrong</h3>
                <p className="text-muted-foreground text-sm">
                  We encountered an unexpected error. Don't worry, your data is safe.
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-500/10 rounded-xl p-4 text-left">
                  <p className="text-xs font-mono text-red-300 break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={this.handleRetry}
                  className="rounded-xl bg-primary hover:bg-primary/90"
                >
                  <ArrowClockwise className="h-4 w-4 mr-2" weight="bold" />
                  Try again
                </Button>
                <Link href="/">
                  <Button variant="outline" className="rounded-xl">
                    <House className="h-4 w-4 mr-2" weight="bold" />
                    Go home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  return handleError;
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export function PageErrorFallback({ 
  message = "This page couldn't be loaded",
  onRetry 
}: { 
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto h-20 w-20 bg-red-500/20 rounded-2xl flex items-center justify-center">
          <WarningCircle className="h-10 w-10 text-red-400" weight="duotone" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Oops!</h2>
          <p className="text-muted-foreground">{message}</p>
        </div>

        <div className="flex gap-3 justify-center">
          {onRetry && (
            <Button onClick={onRetry} className="rounded-xl btn-gradient">
              <ArrowClockwise className="h-4 w-4 mr-2" weight="bold" />
              Retry
            </Button>
          )}
          <Link href="/">
            <Button variant="outline" className="rounded-xl">
              Back to Inbox
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SectionErrorFallback({ 
  title = "Couldn't load this section",
  onRetry 
}: { 
  title?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="glass-panel border-red-500/20 rounded-xl">
      <CardContent className="py-6 text-center space-y-3">
        <WarningCircle className="h-8 w-8 text-red-400 mx-auto" weight="duotone" />
        <p className="text-foreground text-sm">{title}</p>
        {onRetry && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRetry}
            className="text-primary hover:text-primary"
          >
            <ArrowClockwise className="h-4 w-4 mr-1" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
