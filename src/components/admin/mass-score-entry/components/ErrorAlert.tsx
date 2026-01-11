import { AlertCircle } from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorAlertProps {
  failedMatches?: string[];
  message?: string;
  onClear?: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ failedMatches, message, onClear }) => {
  // If we have a direct message, show that
  if (message) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{message}</span>
          {onClear && (
            <button onClick={onClear} className="text-xs underline hover:text-foreground/80">
              Dismiss
            </button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Otherwise show the failedMatches message if available
  if (!failedMatches?.length) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {failedMatches.length} {failedMatches.length === 1 ? 'match' : 'matches'} failed to update.
        Please correct the errors and resubmit.
      </AlertDescription>
    </Alert>
  );
};

export default ErrorAlert;
