
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  bracketId?: string | null;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class BracketErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('🎯 PHASE 4 DIAGNOSIS: BracketErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🎯 PHASE 4 DIAGNOSIS: BracketErrorBoundary componentDidCatch:', {
      error,
      errorInfo,
      bracketId: this.props.bracketId,
      componentStack: errorInfo.componentStack
    });
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    console.log('🎯 PHASE 4 DIAGNOSIS: BracketErrorBoundary retry attempted');
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      console.log('🎯 PHASE 4 DIAGNOSIS: BracketErrorBoundary rendering error state:', {
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        bracketId: this.props.bracketId
      });

      return (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Bracket Rendering Error</p>
                <p>Failed to render bracket component: {this.state.error?.message}</p>
                {this.props.bracketId && (
                  <p className="text-xs opacity-80">Bracket ID: {this.props.bracketId}</p>
                )}
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer">Technical Details</summary>
                  <div className="mt-1 text-xs">
                    <p>Error: {this.state.error?.message}</p>
                    <p>Stack: {this.state.error?.stack}</p>
                    {this.state.errorInfo && (
                      <p>Component Stack: {this.state.errorInfo.componentStack}</p>
                    )}
                  </div>
                </details>
              </div>
            </AlertDescription>
          </Alert>
          
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={this.handleRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default BracketErrorBoundary;
