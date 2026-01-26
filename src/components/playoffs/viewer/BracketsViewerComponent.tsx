import { InMemoryDatabase } from 'brackets-memory-db';
import React, { useEffect, useRef, useState } from 'react';

import { LoadingState } from '@/components/ui/loading-state';
import { BracketsViewerAdapter, ViewerDataWithMapping } from '@/services/brackets/viewer';
import { loadBracketStyles } from '@/styles/bracket-styles';
import { bracketLog, errorLog, warnLog } from '@/utils/logger';
import { PlayoffBracket, PlayoffTeam } from '@/utils/playoffs/playoffTypes';

import { BracketsManagerMatchEditor } from '../match-score-editor/BracketsManagerMatchEditor';

// Dynamic script loader for brackets-viewer (loads only when needed)
const BRACKETS_VIEWER_URL =
  'https://cdn.jsdelivr.net/npm/brackets-viewer@1.8.1/dist/brackets-viewer.min.js';
let scriptLoadPromise: Promise<void> | null = null;

const loadBracketsViewerScript = (): Promise<void> => {
  // Return existing promise if already loading/loaded
  if (scriptLoadPromise) return scriptLoadPromise;

  // Check if already loaded
  if (window.bracketsViewer) {
    return Promise.resolve();
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = BRACKETS_VIEWER_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load brackets-viewer script'));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
};

interface BracketsViewerComponentProps {
  bracket: PlayoffBracket & { bracket_data?: InMemoryDatabase['data'] };
  teams: PlayoffTeam[];
  onMatchClick?: (matchId: string) => void;
}

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
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getPlayoffMatchIdRef = useRef<((id: number) => string | undefined) | null>(null);
  const renderCount = useRef(0);
  const lastFingerprintRef = useRef<string | null>(null);
  const hasRenderedRef = useRef(false);
  const isMountingRef = useRef(true);

  const containerId = 'brackets-viewer-container';

  // Fingerprint function to detect identical data
  const fingerprint = (matches: any[]): string => {
    const ids = matches.map((x) => x.id).join(',');
    const sourced = matches.reduce(
      (n, x) => n + (x?.opponent1?.source_node_id ? 1 : 0) + (x?.opponent2?.source_node_id ? 1 : 0),
      0
    );
    return `${matches.length}:${sourced}:${ids}`;
  };

  // State for brackets-manager match editor
  const [selectedBMMatchId, setSelectedBMMatchId] = useState<number | null>(null);
  const [isBMEditorOpen, setIsBMEditorOpen] = useState(false);

  renderCount.current++;
  bracketLog(`BracketsViewer render #${renderCount.current}`, {
    bracketId: bracket?.id,
    teamsCount: teams?.length,
  });

  // Track component lifecycle
  useEffect(() => {
    bracketLog('BracketsViewerComponent mounted');
    isMountingRef.current = false;
    return () => {
      bracketLog('BracketsViewerComponent unmounted');
    };
  }, []);

  useEffect(() => {
    // Skip render if component is still mounting and data is incomplete
    if (isMountingRef.current && (!bracket?.id || !teams.length)) {
      warnLog('Skipping render: component still mounting with incomplete data');
      return;
    }

    // Guard: require container, bracket, and teams
    if (!containerRef.current || !bracket || !teams.length) {
      bracketLog('Missing required data, skipping render');
      return;
    }

    // Dynamically load brackets-viewer script and CSS if not already loaded
    const initAndRender = async () => {
      try {
        // Load both script and CSS in parallel
        await Promise.all([
          loadBracketsViewerScript(),
          loadBracketStyles(),
        ]);
      } catch (err) {
        errorLog('Failed to load brackets-viewer resources:', err);
        setError('Failed to load bracket viewer library');
        return;
      }

      if (!window.bracketsViewer) {
        setError('brackets-viewer library not loaded');
        errorLog('brackets-viewer is not available on window object');
        return;
      }

      await renderBracket();
    };

    const renderBracket = async () => {
      try {
        // Wait for fonts to be ready (CRITICAL FIX for layout/connector timing)
        await document.fonts.ready;

        bracketLog('Starting bracket transformation', {
          usesBracketsManager: bracket.uses_brackets_manager,
          hasBracketData: !!bracket.bracket_data,
        });

        // Determine which transformation method to use
        let result: ViewerDataWithMapping;

        if (bracket.uses_brackets_manager) {
          // Fetch from brackets-manager SQL tables
          result = await BracketsViewerAdapter.transformFromSql(bracket.id);
        } else if (bracket.bracket_data) {
          // Use JSONB data
          result = BracketsViewerAdapter.transformFromJsonb(bracket.bracket_data, bracket.id);
        } else {
          // Legacy: Use playoff_matches table
          result = BracketsViewerAdapter.transform(bracket, teams, bracket.participants);
        }

        // Store the mapping function in ref
        getPlayoffMatchIdRef.current = result.getPlayoffMatchId;

        bracketLog('Transformation complete', {
          stagesCount: result.data.stages?.length,
          matchesCount: result.data.matches?.length,
          participantsCount: result.data.participants?.length,
        });

        // Guard: validate data structure before rendering
        const m = result.data.matches;
        const s = result.data.stages;

        if (!Array.isArray(m) || m.length === 0 || !Array.isArray(s) || s.length === 0) {
          warnLog('Skipping render: matches or stages not ready');
          return;
        }

        // Validate source coverage (avoid premature render)
        const totalSlots = m.length * 2;
        const sourcedCount = m.reduce(
          (n, x) =>
            n + (x?.opponent1?.source_node_id ? 1 : 0) + (x?.opponent2?.source_node_id ? 1 : 0),
          0
        );
        const sourcePct = totalSlots ? sourcedCount / totalSlots : 0;

        if (sourcePct < 0.6) {
          warnLog('Skipping render: insufficient sources', {
            matches: m.length,
            sourced: sourcedCount,
            pct: Math.round(sourcePct * 100) + '%',
          });
          return;
        }

        // Prevent duplicate re-renders on identical data
        const fp = fingerprint(m);
        if (lastFingerprintRef.current === fp) {
          bracketLog('No-op: identical fingerprint, skipping render');
          return;
        }
        lastFingerprintRef.current = fp;

        // Create the onMatchClick handler with participant validation
        const handleMatchClick = (match: any) => {
          bracketLog('Match clicked', { matchId: match.id });

          // If no onMatchClick handler provided, this is a read-only view
          if (!onMatchClick) {
            return;
          }

          // Allow BYE matches (one participant) to be clicked for manual scoring
          // Only block if BOTH opponents are missing (match not yet determined)
          if (!match.opponent1?.id && !match.opponent2?.id) {
            warnLog('Match clicked but no participants determined yet');
            return;
          }

          // Handle brackets-manager brackets differently
          if (bracket.uses_brackets_manager) {
            bracketLog('Opening brackets-manager match editor for match:', match.id);
            setSelectedBMMatchId(match.id);
            setIsBMEditorOpen(true);
            return;
          }

          // Handle legacy playoff_matches brackets
          if (onMatchClick && getPlayoffMatchIdRef.current) {
            const playoffMatchId = getPlayoffMatchIdRef.current(match.id);

            if (playoffMatchId) {
              bracketLog('Calling onMatchClick with playoff match ID:', playoffMatchId);
              onMatchClick(playoffMatchId);
            } else {
              errorLog('Could not map viewer match ID to playoff match:', match.id);
            }
          }
        };

        // Verify container exists
        const container = containerRef.current;
        if (!container) {
          errorLog('Container element not found!');
          setError('Bracket container not ready');
          return;
        }

        // Set participant images before rendering (required by brackets-viewer API)
        if (window.bracketsViewer.setParticipantImages) {
          const participantImages = result.data.participants
            .filter((p) => p.image)
            .map((p) => ({
              participantId: p.id,
              imageUrl: p.image,
            }));

          if (participantImages.length > 0) {
            bracketLog(`Setting ${participantImages.length} participant images`);
            window.bracketsViewer.setParticipantImages(participantImages);
          }
        }

        // Prepare data for brackets-viewer (INCLUDE groups/rounds for connector rendering)
        const viewerData = {
          stages: result.data.stages,
          groups: result.data.groups,
          rounds: result.data.rounds,
          matches: result.data.matches,
          matchGames: result.data.matchGames,
          participants: result.data.participants,
        };

        // Check if symbol tags survived
        const tagsMissing = viewerData.matches.filter((m) => {
          const need1 = !!m.opponent1;
          const need2 = !!m.opponent2;
          const bad1 = m.opponent1 && Object.getOwnPropertySymbols(m.opponent1).length === 0;
          const bad2 = m.opponent2 && Object.getOwnPropertySymbols(m.opponent2).length === 0;
          return (need1 && bad1) || (need2 && bad2);
        }).length;

        if (tagsMissing > 0) {
          errorLog('Identity tags missing - object identity was lost', { tagsMissing });
          setError('Bracket data integrity failed: identity tags missing');
          return;
        }

        // Render using brackets-viewer v1.8.1 with try/catch
        bracketLog('Calling bracketsViewer.render', {
          matches: viewerData.matches.length,
          sourced: sourcedCount,
        });

        try {
          window.bracketsViewer.render(viewerData, {
            selector: '#brackets-viewer-container',
            clear: !hasRenderedRef.current, // Only clear on first render
            participantOriginPlacement: 'before',
            separatedChildCountLabel: true,
            showSlotsOrigin: true,
            showLowerBracketSlotsOrigin: true,
            highlightParticipantOnHover: true,
            onMatchClick: handleMatchClick,
            customRoundName: (info: any) => {
              const { groupType, roundNumber, roundCount } = info;

              // Grand Final
              if (groupType === 'final-group') {
                return roundNumber === 1 ? 'Grand Final' : 'Grand Final - Round 2';
              }

              // Winners Bracket
              if (groupType === 'winner-bracket') {
                if (roundNumber === roundCount) return 'Winners Final';
                if (roundNumber === roundCount - 1) return 'Winners Semi-Final';
                return `Winners Round ${roundNumber}`;
              }

              // Losers Bracket
              if (groupType === 'loser-bracket') {
                if (roundNumber === roundCount) return 'Losers Final';
                if (roundNumber === roundCount - 1) return 'Losers Semi-Final';
                return `Losers Round ${roundNumber}`;
              }

              return `Round ${roundNumber}`;
            },
          });

          hasRenderedRef.current = true;
          bracketLog('brackets-viewer.render() completed successfully');

          // Force connector recalculation (CRITICAL FIX for layout reflow)
          window.dispatchEvent(new Event('resize'));
        } catch (renderError) {
          errorLog('brackets-viewer.render() threw an error:', renderError);
          setError('Failed to render bracket visualization');
          return;
        }

        bracketLog('BracketsViewerComponent: Render complete');

        // Check for CSS-based connectors (not SVG)
        setTimeout(() => {
          const container = containerRef.current;
          if (!container) return;

          const matches = container.querySelectorAll('.match');
          const connectNext = container.querySelectorAll('.connect-next').length;
          const connectPrevious = container.querySelectorAll('.connect-previous').length;

          if (matches.length === 0) {
            errorLog('No matches rendered - brackets-viewer failed silently');
          }

          // Hide bracket ID if it's showing
          const allText = container.querySelectorAll('*:not(script):not(style)');
          allText.forEach((el) => {
            const text = el.textContent || '';
            // UUID pattern: 8-4-4-4-12 hex characters
            if (
              /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i.test(text.trim())
            ) {
              (el as HTMLElement).style.display = 'none';
            }
          });
        }, 1000);

        setIsInitialized(true);
        setError(null);
      } catch (err) {
        errorLog('Error rendering brackets-viewer:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    initAndRender();

    // Cleanup on unmount
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      setIsInitialized(false);
    };
  }, [
    bracket?.id,
    bracket?.uses_brackets_manager,
    bracket?.bracket_data,
    teams.length,
    onMatchClick,
  ]);

  if (!bracket || !teams.length) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-muted-foreground">No bracket data available</p>
      </div>
    );
  }

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
            ref={containerRef}
            id={containerId}
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
      />
    </>
  );
};

export const BracketsViewerComponent = React.memo(BracketsViewerComponentInner);
