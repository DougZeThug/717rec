import { InMemoryDatabase } from 'brackets-memory-db';
import React, { useCallback, useRef, useState } from 'react';

import { LoadingState } from '@/components/ui/loading-state';
import { bracketLog, errorLog, warnLog } from '@/utils/logger';
import { PlayoffBracket, PlayoffTeam } from '@/utils/playoffs/playoffTypes';

import { BracketsManagerMatchEditor } from '../match-score-editor/BracketsManagerMatchEditor';
import { useBracketsViewerRenderer } from './useBracketsViewerRenderer';
import { useBracketsViewerScript } from './useBracketsViewerScript';

interface BracketsViewerComponentProps {
  bracket: PlayoffBracket & { bracket_data?: InMemoryDatabase['data'] };
  teams: PlayoffTeam[];
  onMatchClick?: (matchId: string) => void;
}

const CONTAINER_ID = 'brackets-viewer-container';

const BracketsViewerComponentInner: React.FC<BracketsViewerComponentProps> = ({
  bracket,
  teams,
  onMatchClick,
}) => {
  // Guard: Require valid bracket with ID
  if (!bracket || !bracket.id) {
    errorLog('BracketsViewerComponent: Invalid bracket prop');
    return (
      <div className="text-center p-8 text-red-500">
        <p>Cannot render bracket: Invalid data</p>
      </div>
    );
  }

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // State for brackets-manager match editor
  const [selectedBMMatchId, setSelectedBMMatchId] = useState<number | null>(null);
  const [isBMEditorOpen, setIsBMEditorOpen] = useState(false);

  // Load brackets-viewer script and CSS
  const { isReady: isScriptReady, error: scriptError } = useBracketsViewerScript();

  // Match click handler - routes to BM editor or legacy handler
  const handleMatchClicked = useCallback(
    (match: any) => {
      bracketLog('Match clicked', { matchId: match.id });

      if (!onMatchClick) return;

      // Block if BOTH opponents are missing (match not yet determined)
      if (!match.opponent1?.id && !match.opponent2?.id) {
        warnLog('Match clicked but no participants determined yet');
        return;
      }

      // Handle brackets-manager brackets
      if (bracket.uses_brackets_manager) {
        bracketLog('Opening brackets-manager match editor for match:', match.id);
        setSelectedBMMatchId(match.id);
        setIsBMEditorOpen(true);
        return;
      }

      // Handle legacy playoff_matches brackets
      if (getPlayoffMatchIdRef.current) {
        const playoffMatchId = getPlayoffMatchIdRef.current(match.id);
        if (playoffMatchId) {
          bracketLog('Calling onMatchClick with playoff match ID:', playoffMatchId);
          onMatchClick(playoffMatchId);
        } else {
          errorLog('Could not map viewer match ID to playoff match:', match.id);
        }
      }
    },
    [onMatchClick, bracket.uses_brackets_manager]
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
    refreshCounter,
    onMatchClicked: handleMatchClicked,
  });

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
        className="w-full h-full min-h-[350px] overflow-x-auto overflow-y-visible bg-background"
        role="region"
        aria-label={`Playoff Bracket: ${bracket?.name || 'Tournament'}`}
      >
        <div
          ref={wrapperRef}
          id="brackets-wrapper"
          style={{ position: 'relative', height: '100%', minHeight: '350px' }}
        >
          <div
            key={`${bracket.id}-${refreshCounter}`}
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
