
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface BracketCreationErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

export class BracketCreationErrorBoundary extends React.Component<
  BracketCreationErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: BracketCreationErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error("BracketCreationErrorBoundary caught error:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("BracketCreationErrorBoundary error details:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  getErrorMessage = () => {
    const { error } = this.state;
    
    if (!error) return "An unknown error occurred";

    // Provide specific error messages based on error type
    if (error.message.includes("divisions")) {
      return "Failed to load divisions. Please check your database connection and ensure divisions are properly configured.";
    }
    
    if (error.message.includes("teams")) {
      return "Failed to load teams. Please ensure teams exist in your selected division.";
    }
    
    if (error.message.includes("network")) {
      return "Network error occurred. Please check your internet connection and try again.";
    }
    
    if (error.message.includes("validation")) {
      return "Form validation error. Please check your input values and try again.";
    }

    return `Error: ${error.message}`;
  };

  getErrorSuggestions = () => {
    const { error } = this.state;
    
    if (!error) return [];

    const suggestions = [];
    
    if (error.message.includes("divisions")) {
      suggestions.push("Ensure at least one division exists in your database");
      suggestions.push("Check database connectivity");
    }
    
    if (error.message.includes("teams")) {
      suggestions.push("Add teams to your divisions first");
      suggestions.push("Verify teams are properly associated with divisions");
    }
    
    if (error.message.includes("network")) {
      suggestions.push("Check your internet connection");
      suggestions.push("Try refreshing the page");
    }

    return suggestions;
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.getErrorMessage();
      const suggestions = this.getErrorSuggestions();

      return (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Bracket Creation Error</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{errorMessage}</p>
            
            {suggestions.length > 0 && (
              <div>
                <p className="font-medium">Suggested fixes:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={this.handleReset}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => console.error('Full error details:', this.state.error, this.state.errorInfo)}
                  className="flex items-center gap-2"
                >
                  <Bug className="h-4 w-4" />
                  Debug Info
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
