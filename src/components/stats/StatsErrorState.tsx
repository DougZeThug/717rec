import { AlertTriangle, RefreshCw } from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface StatsErrorStateProps {
  teamsError: Error | null;
  matchesError: Error | null;
  onRetry?: () => void;
}

const StatsErrorState: React.FC<StatsErrorStateProps> = ({ teamsError, matchesError, onRetry }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Alert variant="destructive" className="max-w-xl">
        <AlertTriangle className="size-5 mr-2" />
        <AlertDescription>
          There was an error loading the statistics data. Please try refreshing the page.
          {teamsError && <p className="mt-2 text-sm">{teamsError.message}</p>}
          {matchesError && <p className="mt-2 text-sm">{matchesError.message}</p>}
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-3 gap-2">
              <RefreshCw className="size-4" />
              Try again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default StatsErrorState;
