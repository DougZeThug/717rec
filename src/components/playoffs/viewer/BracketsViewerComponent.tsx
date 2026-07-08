import { InMemoryDatabase } from 'brackets-memory-db';
import React, { useCallback, useRef, useState } from 'react';

import { LoadingState } from '@/components/ui/loading-state';
import { bracketLog, errorLog, warnLog } from '@/utils/logger';
import { PlayoffBracket, PlayoffTeam } from '@/utils/playoffs/playoffTypes';

import { BracketsManagerMatchEditor } from '../match-score-editor/BracketsManagerMatchEditor';
import type { BracketsViewerMatchClick } from './useBracketsViewerRenderer';
import { useBracketsViewerRenderer } from './useBracketsViewerRenderer';
import { useBracketsViewerScript } from './useBracketsViewerScript';

interface BracketsViewerComponentProps {
  bracket: PlayoffBracket & { bracket_data?: InMemoryDatabase['data'] };
  teams: PlayoffTeam[];
  onMatchClick?: (matchId: string) => void;
  /**
   * External signal that should trigger a re-render of the viewer (e.g. a
   * realtime 'lastUpdate' timestamp). When this value changes, the viewer
   * re-runs its SQL transform so newly populated opponent slots (Grand
   * Final, etc.) appear without requiring a page refresh.
   */
  refreshSignal?: number | string | null;
  /**
   * Whether a realtime subscription is actively delivering refresh signals.
   * When true, the editor's onSaved callback should not bump the refresh
   * counter because the realtime signal already triggers the update.
   */
  realtimeEnabled?: boolean;
}

const CONTAINER_ID = 'brackets-viewer-container';

const BracketsViewerComponentInner: React.FC<BracketsViewerComponentProps> = ({
  bracket,
  teams,
  onMatchClick,
  refreshSignal,
  realtimeEnabled = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // State for brackets-manager match editor
  const [selectedBMMatchId, setSelectedBMMatchId] = useState<number | null>(null);
  const [isBMEditorOpen, setIsBMEditorOpen] = useState(false);

  // Load brackets-viewer script and CSS
  const { isReady: isScriptReady, error: scriptError } = useBracketsViewerScript();

  // Include the external refresh signal in the renderer key so realtime
  // 'match' table updates flow into the viewer without a synchronous effect
  // state update. Internal editor saves still bump refreshCounter below.
  const refreshKey = `${refreshCounter}:${refreshSignal ?? 'initial'}`;

  // Match click handler - routes to BM editor or legacy handler
  const handleMatchClicked = useCallback(
    (match: BracketsViewerMatchClick) => {
      bracketLog('Match clicked', { matchId: match.id });

      if (!onMatchClick) return;

      // Block if BOTH opponents are missing (match not yet determined)
      if (!match.opponent1?.id && !match.opponent2?.id) {
        warnLog('Match clicked but no participants determined yet');
        return;
      }

      // Handle brackets-manager brackets
      if (bracket?.uses_brackets_manager) {
        bracketLog('Opening brackets-manager match editor for match:', match.id);
        setSelectedBMMatchId(Number(match.id));
        setIsBMEditorOpen(true);
        return;
      }

      // Handle legacy playoff_matches brackets
      // eslint-disable-next-line react-hooks/immutability -- stable ref is returned by the renderer hook below and read only from this click handler.
      if (getPlayoffMatchIdRef.current) {
        const playoffMatchId = getPlayoffMatchIdRef.current(Number(match.id));
        if (playoffMatchId) {
          bracketLog('Calling onMatchClick with playoff match ID:', playoffMatchId);
          onMatchClick(playoffMatchId);
        } else {
          errorLog('Could not map viewer match ID to playoff match:', match.id);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getPlayoffMatchIdRef is a stable ref from useBracketsViewerRenderer.
    [onMatchClick, bracket?.uses_brackets_manager]
  );

  // Render the bracket visualization
  const {
    isInitialized,
    error: renderError,
    getPlayoffMatchIdRef,
  } = useBracketsViewerRenderer({
    bracket,
    containerRef,
    containerId: CONTAINER_ID,
    isScriptReady,
    refreshKey,
    onMatchClicked: handleMatchClicked,
  });

  // Guard: Require valid bracket with ID — moved AFTER all hooks to comply with
  // the Rules of Hooks (hooks must always be called in the same order).
  if (!bracket || !bracket.id) {
    errorLog('BracketsViewerComponent: Invalid bracket prop');
    return (
      <div className="text-center p-8 text-red-500">
        <p>Cannot render bracket: Invalid data</p>
      </div>
    );
  }

  if (!bracket || !teams.length) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-muted-foreground">No bracket data available</p>
      </div>
    );
  }

  const error = scriptError || renderError;

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-destructive">Error loading bracket: {error}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Please ensure brackets-viewer is properly installed and loaded.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="size-full min-h-[350px] overflow-x-auto overflow-y-visible bg-background"
        role="region"
        aria-label={`Playoff Bracket: ${bracket?.name || 'Tournament'}`}
      >
        <div
          ref={wrapperRef}
          id="brackets-wrapper"
          style={{ position: 'relative', height: '100%', minHeight: '350px' }}
        >
          <div
            key={`${bracket.id}-${refreshKey}`}
            ref={containerRef}
            id={CONTAINER_ID}
            className="brackets-viewer p-4 md:p-8 font-bebas bg-background"
            style={{
              position: 'relative',
              minWidth: 'fit-content',
              width: 'max-content',
              overflow: 'visible',
              pointerEvents: 'auto',
              transform: 'scale(1)',
              transformOrigin: 'top left',
            }}
          />
        </div>
        {!isInitialized && <LoadingState variant="section" message="Loading bracket..." />}
      </div>

      {/* Brackets-manager match editor */}
      <BracketsManagerMatchEditor
        matchId={selectedBMMatchId}
        bracketId={bracket.id}
        isOpen={isBMEditorOpen}
        onClose={() => {
          setIsBMEditorOpen(false);
          setSelectedBMMatchId(null);
        }}
        onSaved={() => {
          setRefreshCounter((c) => c + 1);
        }}
      />
    </>
  );
};

export const BracketsViewerComponent = React.memo(BracketsViewerComponentInner);
