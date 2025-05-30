
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TeamSelectionErrorProps {
  message?: string | null;
  onRetry?: () => void;
}

/**
 * Error state component for team selection
 * Displays error message and optional retry functionality
 */
export const TeamSelectionError: React.FC<TeamSelectionErrorProps> = ({
  message = "Failed to load teams",
  onRetry
}) => {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-5 h-5" />
          Error Loading Teams
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          {message || "Unable to load teams for bracket creation. Please try again."}
        </p>
        
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
