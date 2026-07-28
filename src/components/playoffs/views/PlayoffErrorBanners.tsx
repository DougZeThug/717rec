import React from 'react';

import { Button } from '@/components/ui/button';
import { ErrorDisplay } from '@/components/ui/error-display';

import { PlayoffPageData } from '../hooks/usePlayoffPageData';

interface PlayoffErrorBannersProps {
  data: PlayoffPageData;
}

/**
 * Surfaces the playoff page's failed fetches.
 *
 * Without this, a failed load is invisible: the selected-bracket query can error
 * while `ready` simply stays false, so the page silently falls back to the bracket
 * list with `?bracket=<id>` still in the URL — a refresh just retries the same
 * broken bracket. "Back to brackets" clears that param, which is the only way out.
 *
 * Shared by PlayoffView and AdminView, whose bracket blocks are identical.
 */
const PlayoffErrorBanners: React.FC<PlayoffErrorBannersProps> = ({ data }) => {
  const hasAnyError =
    data.selectedBracketError || data.bracketsError || data.divisionsError || data.error;
  if (!hasAnyError) return null;

  return (
    <div className="mb-4 space-y-3">
      {data.selectedBracketError && (
        <div className="space-y-2">
          <ErrorDisplay
            variant="card"
            context="Loading bracket"
            error={data.selectedBracketError}
            onRetry={data.retrySelectedBracket}
          />
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => data.setSelectedBracketId(null)}>
              Back to brackets
            </Button>
          </div>
        </div>
      )}

      {data.bracketsError && (
        <ErrorDisplay
          context="Loading brackets"
          error={data.bracketsError}
          // refetchBrackets re-throws after recording the failure in `data.error`,
          // so swallow here rather than leaving an unhandled rejection.
          onRetry={() => {
            data.refetchBrackets().catch(() => undefined);
          }}
        />
      )}

      {data.divisionsError && (
        <ErrorDisplay context="Loading divisions" error={data.divisionsError} />
      )}

      {data.error && <ErrorDisplay context="Playoffs" error={data.error} />}
    </div>
  );
};

export default PlayoffErrorBanners;
