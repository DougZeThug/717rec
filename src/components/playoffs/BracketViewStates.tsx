import { AlertCircle, Loader2 } from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getUIErrorMessage } from '@/utils/errorHandler';

export const InvalidBracketIdState: React.FC = () => (
  <div className="p-8 text-center">
    <div className="text-muted-foreground">
      <p className="text-lg font-semibold mb-2">Invalid bracket ID</p>
      <p className="text-sm">Cannot display bracket without a valid identifier.</p>
    </div>
  </div>
);

export const BracketLoadingState: React.FC<{ progress: { label: string; percent: number } }> = ({
  progress,
}) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center space-y-4 w-full max-w-xs">
      <Loader2 className="size-8 animate-spin mx-auto text-primary" />
      <div className="space-y-2">
        <p className="font-medium text-foreground">{progress.label}</p>
        <Progress value={progress.percent} className="h-2" />
        <p className="text-xs text-muted-foreground">{progress.percent}% complete</p>
      </div>
    </div>
  </div>
);

const BracketErrorAlert: React.FC<{ error: unknown }> = ({ error }) => (
  <Alert variant="destructive">
    <AlertCircle className="size-4" />
    <AlertDescription>
      <div className="space-y-2">
        {/* Never error.message: that is raw PostgREST text, which names
            tables and constraints. getUIErrorMessage keeps the reason
            when there is a safe one and falls back to a plain sentence
            otherwise. */}
        <p>{getUIErrorMessage(error, 'Failed to load bracket')}</p>
      </div>
    </AlertDescription>
  </Alert>
);

export const BracketErrorState: React.FC<{ error: unknown; onRetry: () => void }> = ({
  error,
  onRetry,
}) => (
  <div className="space-y-4">
    <BracketErrorAlert error={error} />

    <div className="flex justify-center">
      <Button variant="outline" onClick={onRetry}>
        Try Again
      </Button>
    </div>
  </div>
);

export const BracketEmptyState: React.FC<{ bracketId: string }> = ({ bracketId }) => (
  <div className="text-center p-8 space-y-3">
    <div className="space-y-2">
      <p className="text-lg font-medium text-foreground">No bracket selected</p>
      <p className="text-sm text-muted-foreground">
        Choose a bracket from the list above to view matches
      </p>
    </div>
    {bracketId && (
      <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground">
        <p>Attempted to load bracket: {bracketId}</p>
        <p className="mt-1">The bracket may have been deleted or you may not have access to it.</p>
      </div>
    )}
  </div>
);

export const BracketCorruptState: React.FC = () => (
  <div className="text-center p-8 space-y-3">
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-lg font-medium text-red-700">Data Structure Error</p>
      <p className="text-sm text-red-600 mt-1">Bracket found but matches data is corrupted</p>
    </div>
  </div>
);
