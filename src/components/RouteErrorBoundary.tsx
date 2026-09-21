/**
 * Route-level Error Boundary for catching errors within specific routes
 * Keeps the page layout (navbar/footer) intact while showing error UI
 */
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from 'lucide-react';
import React, { Component, ErrorInfo, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { isChunkLoadError } from '@/utils/chunkLoadError';
import { captureError } from '@/utils/sentry';

import { ChunkLoadRecovery } from './ChunkLoadRecovery';

interface Props {
  children: ReactNode;
  routeName: string;
  /**
   * Change this to clear a caught error. The app-level boundary in AppLayout
   * passes the pathname: it sits above <Suspense> and never unmounts, so one
   * page that failed to download used to leave the recovery panel on screen
   * for every later page too — links changed the URL and nothing else.
   */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  /** The route this error belongs to, so a move to another one clears it. */
  shownFor: string | null;
}

/**
 * routeName as well as resetKey. The per-route boundaries look like they
 * remount on navigation, but React Router renders route elements with no key,
 * so two of these at the same position are the same element type and React
 * keeps the instance — measured, not assumed. They latch exactly like the
 * app-level one did, and routeName already differs per route, so it resets
 * them without threading a prop through all 25 call sites.
 */
const routeSignature = (props: Props): string => `${props.routeName}\u0000${props.resetKey ?? ''}`;

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, shownFor: routeSignature(props) };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  // Clearing here rather than in componentDidUpdate: this runs before the
  // render, so the new page appears in one pass instead of the error screen
  // flashing first and a setState then replacing it.
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    const signature = routeSignature(props);
    if (signature === state.shownFor) return null;
    // Moving to another page is a fresh attempt: its code may well be here.
    return { shownFor: signature, hasError: false, error: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // A page that could not be downloaded is a lost connection or a fresh
    // deploy, not a defect in the page. Reporting it buries real crashes.
    if (isChunkLoadError(error)) return;
    // Log to Sentry with route context
    captureError(error, {
      componentStack: errorInfo.componentStack,
      routeName: this.props.routeName,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoBack = () => {
    window.history.back();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // The page's code never arrived, so there is nothing to try again here.
      // ChunkLoadRecovery owns that case, because it needs a reload.
      if (isChunkLoadError(this.state.error)) {
        return <ChunkLoadRecovery />;
      }

      return (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-destructive/10 rounded-full">
                <AlertTriangle className="size-10 text-destructive" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">
                Failed to load {this.props.routeName}
              </h2>
              <p className="text-muted-foreground text-sm">
                Something went wrong loading this page. You can try again or navigate elsewhere.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="p-3 bg-muted rounded-lg text-left">
                <p className="text-xs font-mono text-destructive break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={this.handleRetry} variant="default" size="sm">
                <RefreshCw className="mr-2 size-4" />
                Try Again
              </Button>
              <Button onClick={this.handleGoBack} variant="outline" size="sm">
                <ArrowLeft className="mr-2 size-4" />
                Go Back
              </Button>
              <Button onClick={this.handleGoHome} variant="ghost" size="sm">
                <Home className="mr-2 size-4" />
                Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
