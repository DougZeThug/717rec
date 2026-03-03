import { InMemoryDatabase } from 'brackets-memory-db';
import { useEffect, useRef, useState } from 'react';

import { BracketsViewerAdapter, ViewerDataWithMapping } from '@/services/brackets/viewer';
import { bracketLog, errorLog, warnLog } from '@/utils/logger';
import { PlayoffBracket } from '@/utils/playoffs/playoffTypes';

/** Fingerprint function to detect identical match data and skip redundant renders. */
const fingerprint = (matches: any[]): string => {
  const ids = matches.map((x) => x.id).join(',');
  const sourced = matches.reduce(
    (n, x) => n + (x?.opponent1?.source_node_id ? 1 : 0) + (x?.opponent2?.source_node_id ? 1 : 0),
    0
  );
  return `${matches.length}:${sourced}:${ids}`;
};

/** Custom round name formatter for brackets-viewer. */
const customRoundName = (info: any): string => {
  const { groupType, roundNumber, roundCount } = info;

  if (groupType === 'final-group') {
    return roundNumber === 1 ? 'Grand Final' : 'Grand Final - Round 2';
  }

  if (groupType === 'winner-bracket') {
    if (roundNumber === roundCount) return 'Winners Final';
    if (roundNumber === roundCount - 1) return 'Winners Semi-Final';
    return `Winners Round ${roundNumber}`;
  }

  if (groupType === 'loser-bracket') {
    if (roundNumber === roundCount) return 'Losers Final';
    if (roundNumber === roundCount - 1) return 'Losers Semi-Final';
    return `Losers Round ${roundNumber}`;
  }

  return `Round ${roundNumber}`;
};

/** Hide any UUID text nodes that brackets-viewer may render (bracket IDs). */
const hideUuidNodes = (container: HTMLElement) => {
  const allText = container.querySelectorAll('*:not(script):not(style)');
  allText.forEach((el) => {
    const text = el.textContent || '';
    if (/^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i.test(text.trim())) {
      (el as HTMLElement).style.display = 'none';
    }
  });
};

interface UseBracketsViewerRendererOptions {
  bracket: PlayoffBracket & { bracket_data?: InMemoryDatabase['data'] };
  containerRef: React.RefObject<HTMLDivElement | null>;
  containerId: string;
  isScriptReady: boolean;
  refreshCounter: number;
  onMatchClicked: (match: any) => void;
}

/**
 * Hook that handles the brackets-viewer render lifecycle:
 * data transformation, validation, rendering, and cleanup.
 */
export const useBracketsViewerRenderer = ({
  bracket,
  containerRef,
  containerId,
  isScriptReady,
  refreshCounter,
  onMatchClicked,
}: UseBracketsViewerRendererOptions) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getPlayoffMatchIdRef = useRef<((id: number) => string | undefined) | null>(null);
  const lastFingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isScriptReady || !containerRef.current || !bracket?.id) {
      return;
    }

    let cancelled = false;

    const renderBracket = async () => {
      try {
        // Wait for fonts (CRITICAL for layout/connector timing)
        await document.fonts.ready;
        if (cancelled) return;

        bracketLog('Starting bracket transformation', {
          usesBracketsManager: bracket.uses_brackets_manager,
          hasBracketData: !!bracket.bracket_data,
        });

        // Determine which transformation method to use
        let result: ViewerDataWithMapping;

        if (bracket.uses_brackets_manager) {
          result = await BracketsViewerAdapter.transformFromSql(bracket.id);
        } else if (bracket.bracket_data) {
          result = BracketsViewerAdapter.transformFromJsonb(bracket.bracket_data, bracket.id);
        } else {
          result = BracketsViewerAdapter.transform(bracket, [], bracket.participants);
        }

        if (cancelled) return;

        getPlayoffMatchIdRef.current = result.getPlayoffMatchId;

        // Validate data structure before rendering
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

        if (cancelled) return;

        // Verify container still exists
        const container = containerRef.current;
        if (!container) {
          warnLog('Container element not found (component likely unmounted during async render)');
          return;
        }

        // Set participant images (required by brackets-viewer API)
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

        // Check if symbol tags survived (object identity validation)
        const tagsMissing = viewerData.matches.filter((match) => {
          const need1 = !!match.opponent1;
          const need2 = !!match.opponent2;
          const bad1 = match.opponent1 && Object.getOwnPropertySymbols(match.opponent1).length === 0;
          const bad2 = match.opponent2 && Object.getOwnPropertySymbols(match.opponent2).length === 0;
          return (need1 && bad1) || (need2 && bad2);
        }).length;

        if (tagsMissing > 0) {
          errorLog('Identity tags missing - object identity was lost', { tagsMissing });
          setError('Bracket data integrity failed: identity tags missing');
          return;
        }

        if (cancelled) return;

        // Render using brackets-viewer
        bracketLog('Calling bracketsViewer.render', {
          matches: viewerData.matches.length,
          sourced: sourcedCount,
        });

        try {
          window.bracketsViewer.render(viewerData, {
            selector: `#${containerId}`,
            clear: true,
            participantOriginPlacement: 'before',
            separatedChildCountLabel: true,
            showSlotsOrigin: true,
            showLowerBracketSlotsOrigin: true,
            highlightParticipantOnHover: true,
            onMatchClick: onMatchClicked,
            customRoundName,
          });

          bracketLog('brackets-viewer.render() completed successfully');
          window.dispatchEvent(new Event('resize'));
        } catch (renderError) {
          errorLog('brackets-viewer.render() threw an error:', renderError);
          setError('Failed to render bracket visualization');
          return;
        }

        // Post-render cleanup
        setTimeout(() => {
          if (cancelled) return;
          const el = containerRef.current;
          if (!el) return;

          const matches = el.querySelectorAll('.match');
          if (matches.length === 0) {
            errorLog('No matches rendered - brackets-viewer failed silently');
          }

          hideUuidNodes(el);
        }, 1000);

        setIsInitialized(true);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        errorLog('Error rendering brackets-viewer:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    renderBracket();

    return () => {
      cancelled = true;
      setIsInitialized(false);
    };
  }, [
    bracket?.id,
    bracket?.uses_brackets_manager,
    bracket?.bracket_data,
    isScriptReady,
    containerId,
    onMatchClicked,
    refreshCounter,
    containerRef,
  ]);

  return { isInitialized, error, getPlayoffMatchIdRef };
};
