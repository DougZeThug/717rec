import { InMemoryDatabase } from 'brackets-memory-db';
import React, { useCallback, useEffect, useRef, useState } from 'react';

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
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Later rounds sit off the right of a phone screen with nothing to say so.
  const [canScrollSideways, setCanScrollSideways] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

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

  /**
   * Watches whether the bracket is wider than the screen.
   *
   * The viewer's render is asynchronous and not awaited, so the container is
   * empty at mount and any one-off measurement would report "it fits". The
   * element that grows is the inner container, which is drawn at max-content
   * width: the scroller and the wrapper keep the viewport's width however wide
   * the bracket gets, so observing those alone would never fire again. The
   * scroller is still observed for rotation and window resizes.
   *
   * Re-runs when the render finishes and when a refresh replaces the container
   * node, so the observation never ends up attached to a node React has thrown
   * away.
   */
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const overflowing = scroller.scrollWidth - scroller.clientWidth > 8;
      // Guarded by value: showing the hint changes the page height, which would
      // otherwise call this straight back.
      setCanScrollSideways((current) => (current === overflowing ? current : overflowing));
    };

    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    if (containerRef.current) observer.observe(containerRef.current);
    measure();

    const onScroll = () => setHasScrolled(true);
    scroller.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', onScroll);
    };
  }, [refreshKey, isInitialized]);

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
        ref={scrollerRef}
        className="size-full min-h-[350px] overflow-x-auto overflow-y-visible bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        role="region"
        // Focusable so the bracket can be scrolled with the arrow keys, which is
        // the only way to reach the later rounds without a pointer.
        tabIndex={0}
        aria-label={`Playoff Bracket: ${bracket?.name || 'Tournament'}. Scroll sideways to see later rounds.`}
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

      {/*
        Outside the scrolling box, so it stays put instead of sliding away with
        round one. Hidden from screen readers: the instruction is already in the
        region's name, and it is about swiping.
      */}
      {canScrollSideways && !hasScrolled && (
        <p aria-hidden="true" className="mt-2 text-center text-xs text-muted-foreground md:hidden">
          Swipe to see later rounds →
        </p>
      )}

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
          // When realtime is active, the refreshSignal effect already bumps the
          // counter, so a direct increment here would trigger redundant SQL
          // queries. Only fall back to manual refresh when realtime is disabled.
          if (!realtimeEnabled) {
            setRefreshCounter((c) => c + 1);
          }
        }}
      />
    </>
  );
};

export const BracketsViewerComponent = React.memo(BracketsViewerComponentInner);
