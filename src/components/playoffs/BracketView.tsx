import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  type BracketViewDisplayBracket,
  useBracketViewData,
} from '@/hooks/brackets/useBracketViewData';
import type { BracketViewData } from '@/types/playoff';
import { bracketLog, debugLog, errorLog, log } from '@/utils/logger';
import type { PlayoffTeam } from '@/utils/playoffs/playoffTypes';

import BracketErrorBoundary from './BracketErrorBoundary';
import { resolveBracketViewState } from './bracketViewState';
import {
  BracketCorruptState,
  BracketEmptyState,
  BracketErrorState,
  BracketLoadingState,
  InvalidBracketIdState,
} from './BracketViewStates';
import { FinalStandings } from './FinalStandings';
import { BracketsViewerComponent } from './viewer';

interface BracketViewProps {
  bracketId: string;
  bracket?: BracketViewData;
  teams?: PlayoffTeam[];
  onEditMatch?: (matchId: string) => void;
}

/** Render, mount and prop-change diagnostics. */
const useBracketViewLogging = (
  bracketId: string,
  legacyBracket: BracketViewData | undefined,
  legacyTeams: PlayoffTeam[] | undefined
) => {
  const hookCallCount = useRef(0);
  const renderCount = useRef(0);

  useEffect(() => {
    hookCallCount.current++;
    renderCount.current++;
    log(`BracketView hooks called: ${hookCallCount.current}, render: ${renderCount.current}`, {
      bracketId,
      hasLegacyBracket: !!legacyBracket,
    });
  });

  bracketLog('BracketView rendering with props:', {
    bracketId,
    hasLegacyBracket: !!legacyBracket,
    hasLegacyTeams: !!legacyTeams,
  });

  useEffect(() => {
    log('BracketView MOUNTED', { bracketId });
    return () => {
      log('BracketView UNMOUNTED', { bracketId });
    };
  }, [bracketId]);

  useEffect(() => {
    debugLog('BracketView props changed:', {
      bracketId,
      hasLegacyBracket: !!legacyBracket,
    });
  }, [bracketId, legacyBracket, legacyTeams]);
};

interface BracketReadyViewProps {
  bracketId: string;
  displayBracket: NonNullable<BracketViewDisplayBracket>;
  displayTeams: PlayoffTeam[];
  onMatchClick: (matchId: string) => void;
  lastUpdate: Date | null;
  realtimeEnabled: boolean;
}

const BracketReadyView: React.FC<BracketReadyViewProps> = ({
  bracketId,
  displayBracket,
  displayTeams,
  onMatchClick,
  lastUpdate,
  realtimeEnabled,
}) => {
  const showStandings = displayBracket.state === 'completed';

  return (
    <div className="size-full min-h-[400px] md:min-h-[600px] space-y-4">
      <FinalStandings bracketId={bracketId} show={showStandings} />

      <BracketErrorBoundary bracketId={bracketId}>
        {displayBracket?.id ? (
          <BracketsViewerComponent
            // Cast needed due to union type from multiple data sources
            bracket={
              displayBracket as unknown as Parameters<typeof BracketsViewerComponent>[0]['bracket']
            }
            teams={
              'teams' in displayBracket && displayBracket.teams
                ? displayBracket.teams
                : displayTeams
            }
            onMatchClick={onMatchClick}
            refreshSignal={lastUpdate ? lastUpdate.getTime() : null}
            realtimeEnabled={realtimeEnabled}
          />
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            <p>Invalid bracket data</p>
          </div>
        )}
      </BracketErrorBoundary>
    </div>
  );
};

const BracketView: React.FC<BracketViewProps> = ({
  bracketId,
  bracket: legacyBracket,
  teams: legacyTeams,
  onEditMatch,
}) => {
  useBracketViewLogging(bracketId, legacyBracket, legacyTeams);

  const {
    bracketInfo,
    isLoadingBracketInfo,
    isLoadingLegacy,
    isLoading,
    error,
    loadingProgress,
    displayBracket,
    isJsonbBracket,
    handleRetry,
    realtimeEnabled,
    lastUpdate,
  } = useBracketViewData(bracketId, legacyBracket);

  const handleMatchClick = useCallback(
    (matchId: string) => {
      onEditMatch?.(matchId);
    },
    [onEditMatch]
  );

  const displayTeams = useMemo(() => {
    return legacyTeams || [];
  }, [legacyTeams]);

  // The state is worked out AFTER all hooks, to comply with Rules of Hooks.
  const state = resolveBracketViewState({
    bracketId,
    isLoading,
    error,
    hasLegacyBracket: Boolean(legacyBracket),
    isJsonbBracket,
    displayBracket,
  });

  if (state.kind !== 'invalid-id') {
    debugLog('Data fetching status:', {
      isLoadingBracketInfo,
      isLoadingLegacy,
      hasLegacyBracket: Boolean(legacyBracket),
      bracketInfo: bracketInfo ? { id: bracketInfo.id } : null,
    });
  }

  switch (state.kind) {
    case 'invalid-id':
      errorLog('Invalid bracketId', { bracketId });
      return <InvalidBracketIdState />;

    case 'loading':
      debugLog('Showing loading state');
      return <BracketLoadingState progress={loadingProgress} />;

    case 'error':
      debugLog('Showing error state:', error?.message);
      return <BracketErrorState error={error} onRetry={handleRetry} />;

    case 'empty':
      debugLog('Showing empty state - no bracket data');
      return <BracketEmptyState bracketId={bracketId} />;

    case 'corrupt':
      errorLog('CRITICAL - Bracket exists but matches is not an array!', {
        bracket: displayBracket,
        matchesProperty: state.matches,
      });
      return <BracketCorruptState />;

    default: // 'ready'
      bracketLog('About to render BracketsViewerComponent:', {
        isJsonbBracket,
        bracketId: displayBracket?.id,
        matchesCount: state.matchesCount,
      });

      bracketLog('Rendering BracketsViewerComponent');

      return (
        <BracketReadyView
          bracketId={bracketId}
          displayBracket={displayBracket as NonNullable<typeof displayBracket>}
          displayTeams={displayTeams}
          onMatchClick={handleMatchClick}
          lastUpdate={lastUpdate}
          realtimeEnabled={realtimeEnabled}
        />
      );
  }
};

export default React.memo(BracketView);
