import { AlertCircle, ChevronDown, RotateCcw, X } from 'lucide-react';
import React, { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorAlertProps {
  failedMatches?: string[];
  errorMessages?: Record<string, string>;
  savedCount?: number;
  message?: string;
  onClear?: () => void;
  onRetryFailed?: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  failedMatches,
  errorMessages = {},
  savedCount,
  message,
  onClear,
  onRetryFailed,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (message) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="size-4" />
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{message}</span>
          {onClear && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              Dismiss
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (!failedMatches?.length) return null;

  const summary =
    savedCount === undefined
      ? `${failedMatches.length} ${failedMatches.length === 1 ? 'match' : 'matches'} failed to update.`
      : `${savedCount} saved, ${failedMatches.length} failed.`;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="size-4" />
      <AlertDescription className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">{summary}</p>
            <p>Please retry the failed matches or dismiss this banner to keep editing.</p>
          </div>
          <div className="flex gap-2">
            {onRetryFailed && (
              <Button type="button" variant="secondary" size="sm" onClick={onRetryFailed}>
                <RotateCcw className="mr-1 size-3" /> Retry failed
              </Button>
            )}
            {onClear && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClear}
                aria-label="Dismiss errors"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
        {Object.keys(errorMessages).length > 0 && (
          <div>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-destructive-foreground underline"
              onClick={() => setShowDetails((current) => !current)}
            >
              <ChevronDown className={`mr-1 size-3 ${showDetails ? 'rotate-180' : ''}`} />
              {showDetails ? 'Hide details' : 'Show details'}
            </Button>
            {showDetails && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {failedMatches.map((matchId) => (
                  <li key={matchId}>
                    {errorMessages[matchId] || 'Could not save this match — try again.'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default ErrorAlert;
