import { InMemoryDatabase } from 'brackets-memory-db';
import type { Match, ParticipantResult } from 'brackets-model';
import { useEffect, useRef, useState } from 'react';

import { BracketsViewerAdapter, ViewerDataWithMapping } from '@/services/brackets/viewer';
import { bracketLog, errorLog, warnLog } from '@/utils/logger';
import { PlayoffBracket } from '@/utils/playoffs/playoffTypes';

import { decorateBracketDom, hideParticipantImagesFromA11y } from './bracketDecorations';

type BracketsViewerCustomRoundInfo = {
  groupType?: 'final-group' | 'winner-bracket' | 'loser-bracket' | string;
  roundNumber: number;
  roundCount: number;
};

export type BracketsViewerMatchClick = Pick<Match, 'id'> & {
  stage_id?: number | null;
  group_id?: number | null;
  round_id?: number | null;
  number?: number | null;
  opponent1?: ParticipantResult | null;
  opponent2?: ParticipantResult | null;
};

type FingerprintMatch = Pick<Match, 'id' | 'status' | 'opponent1' | 'opponent2'>;

/** Fingerprint function to detect identical match data and skip redundant renders. */
const fingerprint = (matches: FingerprintMatch[]): string => {
  const ids = matches.map((x) => x.id).join(',');
  // Include opponent IDs and status so newly populated slots (e.g. a Grand
  // Final that just received its WB/LB finalists) are not treated as
  // identical to the previous "TBD" render.
  const slots = matches
    .map(
      (x) =>
        `${x.opponent1?.id ?? 'n'}#${x.opponent1?.score ?? '-'}:${x.opponent1?.result ?? ''}|` +
        `${x.opponent2?.id ?? 'n'}#${x.opponent2?.score ?? '-'}:${x.opponent2?.result ?? ''}|` +
        `s=${x.status ?? ''}`
    )
    .join(',');
  return `${matches.length}:${ids}:${slots}`;
};

type ViewerMatchRow = ViewerDataWithMapping['data']['matches'][number];
type ViewerParticipantRow = ViewerDataWithMapping['data']['participants'][number];
type RenderableBracket = PlayoffBracket & { bracket_data?: InMemoryDatabase['data'] };

/**
 * Pick the transform that matches where this bracket keeps its data: the SQL
 * tables, a JSONB blob, or the legacy playoff_matches shape.
 */
const transformForViewer = async (bracket: RenderableBracket): Promise<ViewerDataWithMapping> => {
  if (bracket.uses_brackets_manager) {
    return BracketsViewerAdapter.transformFromSql(bracket.id);
  }
  if (bracket.bracket_data) {
    return BracketsViewerAdapter.transformFromJsonb(bracket.bracket_data, bracket.id);
  }
  return BracketsViewerAdapter.transform(bracket, [], bracket.participants);
};

/** Hand the viewer the team logos, if this build of it takes them. */
const applyParticipantImages = (participants: ViewerParticipantRow[]) => {
  if (!window.bracketsViewer.setParticipantImages) return;

  const participantImages = participants
    .filter((p) => p.image)
    .map((p) => ({ participantId: p.id, imageUrl: p.image ?? '' }));

  if (participantImages.length === 0) return;

  bracketLog(`Setting ${participantImages.length} participant images`);
  window.bracketsViewer.setParticipantImages(participantImages);
};

/**
 * Whether the transform produced enough to draw. Deliberately takes `unknown`:
 * the point of the check is that a transform can hand back a shape the types
 * promise but the data does not keep.
 */
const hasRenderableData = (matchRows: unknown, stageRows: unknown): boolean =>
  Array.isArray(matchRows) &&
  matchRows.length > 0 &&
  Array.isArray(stageRows) &&
  stageRows.length > 0;

/** Opponent slots that know which match fed them. */
const countSourcedSlots = (matchRows: ViewerMatchRow[]): number =>
  matchRows.reduce(
    (n, x) => n + (x?.opponent1?.source_node_id ? 1 : 0) + (x?.opponent2?.source_node_id ? 1 : 0),
    0
  );

/** Populated opponent slots that lost their identity symbols in transit. */
const countUntaggedOpponents = (matchRows: ViewerMatchRow[]): number =>
  matchRows.filter((match) => {
    const need1 = Boolean(match.opponent1);
    const need2 = Boolean(match.opponent2);
    const bad1 = match.opponent1 && Object.getOwnPropertySymbols(match.opponent1).length === 0;
    const bad2 = match.opponent2 && Object.getOwnPropertySymbols(match.opponent2).length === 0;
    return (need1 && bad1) || (need2 && bad2);
  }).length;

/** Custom round name formatter for brackets-viewer. */
const customRoundName = (info: BracketsViewerCustomRoundInfo): string => {
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
  bracket: RenderableBracket;
  containerRef: React.RefObject<HTMLDivElement | null>;
  containerId: string;
  isScriptReady: boolean;
  refreshKey: number | string;
  onMatchClicked: (match: BracketsViewerMatchClick) => void;
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
  refreshKey,
  onMatchClicked,
}: UseBracketsViewerRendererOptions) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getPlayoffMatchIdRef = useRef<((id: number) => string | undefined) | null>(null);
  const lastFingerprintRef = useRef<string | null>(null);

  // Forget the last fingerprint whenever the container can be replaced under
  // us. BracketsViewerComponent keys the container on `${bracket.id}-${refreshKey}`,
  // so both parts belong here: a change to either mounts a fresh, empty node,
  // and a fingerprint held over from the old one would skip the render and
  // leave that node blank. Two different brackets really can share a
  // fingerprint — the legacy transform numbers matches locally per bracket, so
  // two brackets of the same size at the same stage produce identical ids,
  // scores and statuses, and the fingerprint carries no bracket identity.
  useEffect(() => {
    lastFingerprintRef.current = null;
  }, [refreshKey, bracket?.id]);

  useEffect(() => {
    if (!isScriptReady || !containerRef.current || !bracket?.id) {
      // `undefined`, not a bare return: this effect returns a cleanup below.
      return undefined;
    }

    let cancelled = false;
    let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

    const renderBracket = async () => {
      try {
        // Wait for fonts (CRITICAL for layout/connector timing)
        await document.fonts.ready;
        if (cancelled) return;

        bracketLog('Starting bracket transformation', {
          usesBracketsManager: bracket.uses_brackets_manager,
          hasBracketData: Boolean(bracket.bracket_data),
        });

        const result = await transformForViewer(bracket);

        if (cancelled) return;

        getPlayoffMatchIdRef.current = result.getPlayoffMatchId;

        // Validate data structure before rendering
        const matchRows = result.data.matches;
        const stageRows = result.data.stages;

        if (!hasRenderableData(matchRows, stageRows)) {
          warnLog('Skipping render: matches or stages not ready');
          // "Not ready yet" is not a failure, so any error left over from an
          // earlier attempt has to go. Without this the reader keeps an error
          // message over an empty bracket with no spinner under it, because
          // this path never reaches setError(null) below.
          if (!cancelled) setError(null);
          return;
        }

        // Validate source coverage (avoid premature render)
        const totalSlots = matchRows.length * 2;
        const sourcedCount = countSourcedSlots(matchRows);
        const sourcePct = totalSlots ? sourcedCount / totalSlots : 0;

        if (sourcePct < 0.6) {
          bracketLog('Low source coverage (normal for new/bye-heavy brackets)', {
            matches: matchRows.length,
            sourced: sourcedCount,
            pct: `${Math.round(sourcePct * 100)}%`,
          });
        }

        // Prevent duplicate re-renders on identical data
        const fp = fingerprint(matchRows as unknown as FingerprintMatch[]);
        if (lastFingerprintRef.current === fp) {
          bracketLog('No-op: identical fingerprint, skipping render');
          // The bracket already drawn is still correct and is never cleared on
          // this path, so the viewer is still initialised. Without this, the
          // cleanup's setIsInitialized(false) sticks — the effect re-runs on a
          // new `bracket` object identity, and a refetch that returns the same
          // match data lands here before ever reaching setIsInitialized(true).
          // The reader is then left with a "Loading bracket..." spinner under a
          // working bracket until the next refreshKey change or a navigation.
          if (!cancelled) {
            setIsInitialized(true);
            setError(null);
          }
          return;
        }

        if (cancelled) return;

        // Verify container still exists
        const container = containerRef.current;
        if (!container) {
          warnLog('Container element not found (component likely unmounted during async render)');
          return;
        }

        // Set participant images (required by brackets-viewer API)
        applyParticipantImages(result.data.participants);

        // Prepare data for brackets-viewer (INCLUDE groups/rounds for connector rendering)
        const viewerData = {
          stages: result.data.stages,
          groups: result.data.groups,
          rounds: result.data.rounds,
          matches: result.data.matches,
          matchGames: result.data.matchGames,
          participants: result.data.participants,
        };

        // Post-render decoration: flow hints on TBD slots + persistent seed
        // badges. Cosmetic only — a failure here must never break the render.
        const runDecorations = (el: HTMLElement) => {
          try {
            // First, and outside the flow-hint work below: that returns early
            // for brackets with no groups or rounds, and their logos still need
            // taking out of the accessibility tree.
            hideParticipantImagesFromA11y(el);
            decorateBracketDom(el, {
              matches: viewerData.matches,
              groups: viewerData.groups,
              rounds: viewerData.rounds,
              participants: viewerData.participants,
              stageType: viewerData.stages[0]?.type,
            });
          } catch (decorationError) {
            warnLog('Bracket decoration failed (non-fatal):', decorationError);
          }
        };

        // Check if symbol tags survived (object identity validation)
        const tagsMissing = countUntaggedOpponents(viewerData.matches);

        if (tagsMissing > 0) {
          warnLog('Identity tags missing - proceeding anyway', { tagsMissing });
        }

        if (cancelled) return;

        // Render using brackets-viewer
        bracketLog('Calling bracketsViewer.render', {
          matches: viewerData.matches.length,
          sourced: sourcedCount,
        });

        try {
          // Awaited: render() returns a promise, so without this a rejection
          // escapes the catch below and the code carries on to record the
          // fingerprint and report success for a draw that never landed. It
          // also means the DOM is in place before the decorations run, rather
          // than leaving that to the delayed pass further down.
          await window.bracketsViewer.render(
            viewerData as unknown as Parameters<typeof window.bracketsViewer.render>[0],
            {
              selector: `#${containerId}`,
              clear: true,
              participantOriginPlacement: 'before',
              separatedChildCountLabel: true,
              showSlotsOrigin: true,
              showLowerBracketSlotsOrigin: true,
              highlightParticipantOnHover: true,
              onMatchClick: onMatchClicked,
              customRoundName,
            }
          );

          // Awaiting above added a suspension point, so the component can have
          // gone away while the bracket was drawing. Everything below this
          // decorates the DOM or sets state, and none of it belongs to a run
          // that has been superseded.
          if (cancelled) return;

          bracketLog('brackets-viewer.render() completed successfully');
          window.dispatchEvent(new Event('resize'));
          runDecorations(container);
        } catch (renderError) {
          errorLog('brackets-viewer.render() threw an error:', renderError);
          // A superseded run must not re-set an error a later run already
          // cleared. The outer catch has always guarded this; this one did not.
          if (cancelled) return;
          setError('Failed to render bracket visualization');
          return;
        }

        // Only now does the drawn DOM match `fp`. Recording it earlier meant a
        // failed draw was remembered as if it had worked, so the next attempt
        // with the same data took the no-op path above and left the container
        // empty. The two bails between the fingerprint check and here (a
        // cancelled run, a missing container) drew nothing either.
        lastFingerprintRef.current = fp;

        // Post-render cleanup
        cleanupTimer = setTimeout(() => {
          if (cancelled) return;
          const el = containerRef.current;
          if (!el) return;

          const matches = el.querySelectorAll('.match');
          if (matches.length === 0) {
            errorLog('No matches rendered - brackets-viewer failed silently');
          }

          hideUuidNodes(el);
          // render() is awaited now, so the immediate pass already had the DOM.
          // This one stays as belt and braces for anything the viewer settles
          // after its promise resolves.
          runDecorations(el);
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
      if (cleanupTimer) clearTimeout(cleanupTimer);
      setIsInitialized(false);
    };
  }, [bracket, isScriptReady, containerId, onMatchClicked, refreshKey, containerRef]);

  return { isInitialized, error, getPlayoffMatchIdRef };
};
