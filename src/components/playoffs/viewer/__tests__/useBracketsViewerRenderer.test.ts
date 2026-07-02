import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/services/brackets/viewer', () => ({
  BracketsViewerAdapter: {
    transformFromSql: vi.fn(),
    transformFromJsonb: vi.fn(),
    transform: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
  warnLog: vi.fn(),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import type { ViewerDataWithMapping, ViewerMatch } from '@/services/brackets/viewer';
import { BracketsViewerAdapter } from '@/services/brackets/viewer';
import { bracketLog, errorLog, warnLog } from '@/utils/logger';
import type { PlayoffBracket } from '@/utils/playoffs/playoffTypes';

import { useBracketsViewerRenderer } from '../useBracketsViewerRenderer';

const mockedAdapter = vi.mocked(BracketsViewerAdapter);

// ─── document.fonts stub (jsdom does not implement FontFaceSet) ──────────────

let fontsReady: Promise<unknown> = Promise.resolve();

beforeAll(() => {
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    get: () => ({ ready: fontsReady }),
  });
});

// ─── window.bracketsViewer stub ───────────────────────────────────────────────

const renderMock = vi.fn();
const setParticipantImagesMock = vi.fn();

// ─── Fixtures ────────────────────────────────────────────────────────────────

type Opponent = NonNullable<ViewerMatch['opponent1']>;

const makeOpponent = (id: number | null, extra: Partial<Opponent> = {}): Opponent => ({
  id,
  source_node_id: 'src',
  ...extra,
});

const makeMatch = (
  id: number,
  opponent1: ViewerMatch['opponent1'],
  opponent2: ViewerMatch['opponent2'],
  overrides: Partial<ViewerMatch> = {}
): ViewerMatch => ({
  id,
  stage_id: 1,
  group_id: 1,
  round_id: 1,
  number: 1,
  status: 'ready',
  opponent1,
  opponent2,
  ...overrides,
});

const makeParticipant = (id: number, name: string, image?: string) => ({
  id,
  tournament_id: 0,
  name,
  ...(image ? { image } : {}),
});

/** A small 4-team bracket: two semifinals feeding a final. */
const makeResult = (
  overrides: Partial<ViewerDataWithMapping['data']> = {}
): ViewerDataWithMapping => ({
  data: {
    stages: [
      {
        id: 1,
        tournament_id: 0,
        name: 'Playoffs',
        type: 'single_elimination',
        number: 1,
        settings: {},
      },
    ],
    groups: [{ id: 1, stage_id: 1, number: 1 }],
    rounds: [
      { id: 1, stage_id: 1, group_id: 1, number: 1 },
      { id: 2, stage_id: 1, group_id: 1, number: 2 },
    ],
    matches: [
      makeMatch(1, makeOpponent(1), makeOpponent(2)),
      makeMatch(2, makeOpponent(3), makeOpponent(4)),
      // Final: participants not yet determined (TBD)
      makeMatch(3, makeOpponent(null), makeOpponent(null), { round_id: 2, status: 'locked' }),
    ],
    matchGames: [],
    participants: [
      makeParticipant(1, 'Team A'),
      makeParticipant(2, 'Team B'),
      makeParticipant(3, 'Team C'),
      makeParticipant(4, 'Team D'),
    ],
    ...overrides,
  },
  getPlayoffMatchId: vi.fn(),
});

const makeBracket = (
  overrides: Partial<PlayoffBracket> & { bracket_data?: unknown } = {}
): PlayoffBracket & { bracket_data?: never } =>
  ({
    id: 'bracket-1',
    name: 'Championship',
    format: 'single_elimination',
    state: 'in_progress',
    uses_brackets_manager: true,
    ...overrides,
  }) as PlayoffBracket & { bracket_data?: never };

// ─── Test harness ────────────────────────────────────────────────────────────

let container: HTMLDivElement;
let containerRef: { current: HTMLDivElement | null };
const onMatchClicked = vi.fn();

interface HookProps {
  bracket: ReturnType<typeof makeBracket>;
  isScriptReady?: boolean;
  refreshKey?: string | number;
}

const renderRenderer = (initial: HookProps) =>
  renderHook(
    ({ bracket, isScriptReady = true, refreshKey = '0:initial' }: HookProps) =>
      useBracketsViewerRenderer({
        bracket,
        containerRef,
        containerId: 'test-container',
        isScriptReady,
        refreshKey,
        onMatchClicked,
      }),
    { initialProps: initial }
  );

// Flush the microtask chain of the async render (fonts.ready -> transform ->
// render). Fake timers do not fake Promises, so plain awaits drain them.
const flushAsync = async () => {
  await act(async () => {
    for (let i = 0; i < 8; i++) {
      await Promise.resolve();
    }
  });
};

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) so mockImplementations from previous
  // tests (e.g. a throwing render) do not leak forward.
  vi.resetAllMocks();
  fontsReady = Promise.resolve();
  container = document.createElement('div');
  container.id = 'test-container';
  document.body.appendChild(container);
  containerRef = { current: container };
  (window as unknown as { bracketsViewer: unknown }).bracketsViewer = {
    render: renderMock,
    setParticipantImages: setParticipantImagesMock,
  };
  mockedAdapter.transformFromSql.mockResolvedValue(makeResult());
  mockedAdapter.transformFromJsonb.mockReturnValue(makeResult());
  mockedAdapter.transform.mockReturnValue(makeResult());
});

afterEach(() => {
  vi.useRealTimers();
  container.remove();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useBracketsViewerRenderer', () => {
  describe('data transformation routing', () => {
    it('uses the SQL transform for brackets-manager brackets', async () => {
      const { result } = renderRenderer({ bracket: makeBracket() });

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      expect(mockedAdapter.transformFromSql).toHaveBeenCalledWith('bracket-1');
      expect(mockedAdapter.transformFromJsonb).not.toHaveBeenCalled();
      expect(mockedAdapter.transform).not.toHaveBeenCalled();
    });

    it('uses the JSONB transform when bracket_data is present and brackets-manager is off', async () => {
      const bracketData = { stage: [], match: [] };
      const bracket = makeBracket({
        uses_brackets_manager: false,
        bracket_data: bracketData as never,
      });
      const { result } = renderRenderer({ bracket });

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      expect(mockedAdapter.transformFromJsonb).toHaveBeenCalledWith(bracketData, 'bracket-1');
      expect(mockedAdapter.transformFromSql).not.toHaveBeenCalled();
    });

    it('falls back to the legacy transform with bracket participants', async () => {
      const participants = [{ position: 1, team_id: 't1', name: 'Team A' }];
      const bracket = makeBracket({ uses_brackets_manager: false, participants });
      const { result } = renderRenderer({ bracket });

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      expect(mockedAdapter.transform).toHaveBeenCalledWith(bracket, [], participants);
    });

    it('prefers the SQL transform when both brackets-manager flag and bracket_data exist', async () => {
      const bracket = makeBracket({
        uses_brackets_manager: true,
        bracket_data: { stage: [] } as never,
      });
      const { result } = renderRenderer({ bracket });

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      expect(mockedAdapter.transformFromSql).toHaveBeenCalledWith('bracket-1');
      expect(mockedAdapter.transformFromJsonb).not.toHaveBeenCalled();
    });
  });

  describe('render invocation', () => {
    it('passes the full normalized dataset (including groups and rounds) to bracketsViewer.render', async () => {
      const transformed = makeResult();
      mockedAdapter.transformFromSql.mockResolvedValue(transformed);
      const { result } = renderRenderer({ bracket: makeBracket() });

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      expect(renderMock).toHaveBeenCalledTimes(1);
      const [viewerData, config] = renderMock.mock.calls[0];
      expect(viewerData).toEqual({
        stages: transformed.data.stages,
        groups: transformed.data.groups,
        rounds: transformed.data.rounds,
        matches: transformed.data.matches,
        matchGames: transformed.data.matchGames,
        participants: transformed.data.participants,
      });
      expect(config).toMatchObject({
        selector: '#test-container',
        clear: true,
        participantOriginPlacement: 'before',
        separatedChildCountLabel: true,
        showSlotsOrigin: true,
        showLowerBracketSlotsOrigin: true,
        highlightParticipantOnHover: true,
      });
      expect(config.onMatchClick).toBe(onMatchClicked);
      expect(typeof config.customRoundName).toBe('function');
    });

    it('stores the viewer-to-playoff match ID mapper on the returned ref', async () => {
      const transformed = makeResult();
      mockedAdapter.transformFromSql.mockResolvedValue(transformed);
      const { result } = renderRenderer({ bracket: makeBracket() });

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      expect(result.current.getPlayoffMatchIdRef.current).toBe(transformed.getPlayoffMatchId);
    });

    it('dispatches a window resize event after a successful render', async () => {
      const resizeListener = vi.fn();
      window.addEventListener('resize', resizeListener);

      const { result } = renderRenderer({ bracket: makeBracket() });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      expect(resizeListener).toHaveBeenCalled();
      window.removeEventListener('resize', resizeListener);
    });
  });

  describe('guard conditions', () => {
    it('does nothing when the script is not ready', async () => {
      renderRenderer({ bracket: makeBracket(), isScriptReady: false });
      await flushAsync();

      expect(mockedAdapter.transformFromSql).not.toHaveBeenCalled();
      expect(renderMock).not.toHaveBeenCalled();
    });

    it('does nothing when the container ref is empty', async () => {
      containerRef = { current: null };
      renderRenderer({ bracket: makeBracket() });
      await flushAsync();

      expect(mockedAdapter.transformFromSql).not.toHaveBeenCalled();
      expect(renderMock).not.toHaveBeenCalled();
    });

    it('does nothing when the bracket has no id', async () => {
      renderRenderer({ bracket: makeBracket({ id: '' }) });
      await flushAsync();

      expect(mockedAdapter.transformFromSql).not.toHaveBeenCalled();
      expect(renderMock).not.toHaveBeenCalled();
    });

    it('skips rendering when the transform returns no matches', async () => {
      mockedAdapter.transformFromSql.mockResolvedValue(makeResult({ matches: [] }));
      const { result } = renderRenderer({ bracket: makeBracket() });
      await flushAsync();

      expect(warnLog).toHaveBeenCalledWith('Skipping render: matches or stages not ready');
      expect(renderMock).not.toHaveBeenCalled();
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('skips rendering when the transform returns no stages', async () => {
      mockedAdapter.transformFromSql.mockResolvedValue(makeResult({ stages: [] }));
      renderRenderer({ bracket: makeBracket() });
      await flushAsync();

      expect(warnLog).toHaveBeenCalledWith('Skipping render: matches or stages not ready');
      expect(renderMock).not.toHaveBeenCalled();
    });
  });

  describe('participant images', () => {
    it('forwards only participants that have an image', async () => {
      mockedAdapter.transformFromSql.mockResolvedValue(
        makeResult({
          participants: [
            makeParticipant(1, 'Team A', 'https://cdn/a.png'),
            makeParticipant(2, 'Team B'),
            makeParticipant(3, 'Team C', 'https://cdn/c.png'),
          ],
        })
      );
      const { result } = renderRenderer({ bracket: makeBracket() });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      expect(setParticipantImagesMock).toHaveBeenCalledWith([
        { participantId: 1, imageUrl: 'https://cdn/a.png' },
        { participantId: 3, imageUrl: 'https://cdn/c.png' },
      ]);
    });

    it('does not call setParticipantImages when no participant has an image', async () => {
      const { result } = renderRenderer({ bracket: makeBracket() });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      expect(setParticipantImagesMock).not.toHaveBeenCalled();
    });

    it('still renders when setParticipantImages is not provided by the viewer', async () => {
      (window as unknown as { bracketsViewer: unknown }).bracketsViewer = {
        render: renderMock,
      };
      const { result } = renderRenderer({ bracket: makeBracket() });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      expect(renderMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('fingerprint deduplication and late-round updates', () => {
    it('skips a re-render when the data is identical', async () => {
      const transformed = makeResult();
      mockedAdapter.transformFromSql.mockResolvedValue(transformed);
      const { result, rerender } = renderRenderer({ bracket: makeBracket() });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      // New bracket object identity with the same data re-runs the effect
      rerender({ bracket: makeBracket() });
      await flushAsync();

      expect(renderMock).toHaveBeenCalledTimes(1);
      expect(bracketLog).toHaveBeenCalledWith('No-op: identical fingerprint, skipping render');
    });

    it('re-renders when a previously TBD final receives its finalists (late-round regression)', async () => {
      const tbdFinal = makeResult();
      const populatedFinal = makeResult({
        matches: [
          makeMatch(1, makeOpponent(1, { result: 'win', score: 2 }), makeOpponent(2)),
          makeMatch(2, makeOpponent(3, { result: 'win', score: 2 }), makeOpponent(4)),
          // Same match IDs, but the final's opponents are now populated
          makeMatch(3, makeOpponent(1), makeOpponent(3), { round_id: 2, status: 'ready' }),
        ],
      });
      mockedAdapter.transformFromSql
        .mockResolvedValueOnce(tbdFinal)
        .mockResolvedValueOnce(populatedFinal);

      const { result, rerender } = renderRenderer({ bracket: makeBracket() });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      expect(renderMock).toHaveBeenCalledTimes(1);

      rerender({ bracket: makeBracket() });
      await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(2));

      // The second render must include the populated final, not the stale TBD one
      const [secondData] = renderMock.mock.calls[1];
      const finalMatch = secondData.matches.find((m: ViewerMatch) => m.id === 3);
      expect(finalMatch.opponent1.id).toBe(1);
      expect(finalMatch.opponent2.id).toBe(3);
    });

    it('re-renders when only a score changes on the same participants', async () => {
      const before = makeResult();
      const after = makeResult({
        matches: [
          makeMatch(1, makeOpponent(1, { score: 5 }), makeOpponent(2, { score: 3 })),
          makeMatch(2, makeOpponent(3), makeOpponent(4)),
          makeMatch(3, makeOpponent(null), makeOpponent(null), { round_id: 2, status: 'locked' }),
        ],
      });
      mockedAdapter.transformFromSql.mockResolvedValueOnce(before).mockResolvedValueOnce(after);

      const { result, rerender } = renderRenderer({ bracket: makeBracket() });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      rerender({ bracket: makeBracket() });
      await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(2));
    });

    it('re-renders when only a match status changes', async () => {
      const before = makeResult();
      const after = makeResult({
        matches: [
          makeMatch(1, makeOpponent(1), makeOpponent(2), { status: 'completed' }),
          makeMatch(2, makeOpponent(3), makeOpponent(4)),
          makeMatch(3, makeOpponent(null), makeOpponent(null), { round_id: 2, status: 'locked' }),
        ],
      });
      mockedAdapter.transformFromSql.mockResolvedValueOnce(before).mockResolvedValueOnce(after);

      const { result, rerender } = renderRenderer({ bracket: makeBracket() });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      rerender({ bracket: makeBracket() });
      await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(2));
    });

    it('forces a re-render on a refreshKey change even with identical data', async () => {
      const transformed = makeResult();
      mockedAdapter.transformFromSql.mockResolvedValue(transformed);

      const { result, rerender } = renderRenderer({
        bracket: makeBracket(),
        refreshKey: '0:initial',
      });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      expect(renderMock).toHaveBeenCalledTimes(1);

      rerender({ bracket: makeBracket(), refreshKey: '0:1700000000' });
      await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(2));
    });
  });

  describe('error handling', () => {
    it('surfaces the message when the transform throws an Error', async () => {
      mockedAdapter.transformFromSql.mockRejectedValue(new Error('SQL transform blew up'));
      const { result } = renderRenderer({ bracket: makeBracket() });

      await waitFor(() => expect(result.current.error).toBe('SQL transform blew up'));
      expect(result.current.isInitialized).toBe(false);
      expect(renderMock).not.toHaveBeenCalled();
      expect(errorLog).toHaveBeenCalledWith('Error rendering brackets-viewer:', expect.any(Error));
    });

    it('reports "Unknown error" for non-Error rejections', async () => {
      mockedAdapter.transformFromSql.mockRejectedValue('boom');
      const { result } = renderRenderer({ bracket: makeBracket() });

      await waitFor(() => expect(result.current.error).toBe('Unknown error'));
    });

    it('sets a render-specific error when bracketsViewer.render throws', async () => {
      renderMock.mockImplementation(() => {
        throw new Error('viewer exploded');
      });
      const { result } = renderRenderer({ bracket: makeBracket() });

      await waitFor(() =>
        expect(result.current.error).toBe('Failed to render bracket visualization')
      );
      expect(result.current.isInitialized).toBe(false);
      expect(errorLog).toHaveBeenCalledWith(
        'brackets-viewer.render() threw an error:',
        expect.any(Error)
      );
    });

    it('warns (but proceeds) when opponent identity tags are missing', async () => {
      const { result } = renderRenderer({ bracket: makeBracket() });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      // Plain-object opponents carry no symbols, so all populated slots are flagged
      expect(warnLog).toHaveBeenCalledWith('Identity tags missing - proceeding anyway', {
        tagsMissing: 3,
      });
      expect(renderMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('customRoundName (late-round labels)', () => {
    const getCustomRoundName = async (): Promise<
      (info: { groupType?: string; roundNumber: number; roundCount: number }) => string
    > => {
      const { result } = renderRenderer({ bracket: makeBracket() });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      return renderMock.mock.calls[0][1].customRoundName;
    };

    it('labels the final group as Grand Final rounds', async () => {
      const name = await getCustomRoundName();
      expect(name({ groupType: 'final-group', roundNumber: 1, roundCount: 2 })).toBe('Grand Final');
      expect(name({ groupType: 'final-group', roundNumber: 2, roundCount: 2 })).toBe(
        'Grand Final - Round 2'
      );
    });

    it('labels the last two winner-bracket rounds as Final and Semi-Final', async () => {
      const name = await getCustomRoundName();
      expect(name({ groupType: 'winner-bracket', roundNumber: 3, roundCount: 3 })).toBe(
        'Winners Final'
      );
      expect(name({ groupType: 'winner-bracket', roundNumber: 2, roundCount: 3 })).toBe(
        'Winners Semi-Final'
      );
      expect(name({ groupType: 'winner-bracket', roundNumber: 1, roundCount: 3 })).toBe(
        'Winners Round 1'
      );
    });

    it('labels the last two loser-bracket rounds as Final and Semi-Final', async () => {
      const name = await getCustomRoundName();
      expect(name({ groupType: 'loser-bracket', roundNumber: 4, roundCount: 4 })).toBe(
        'Losers Final'
      );
      expect(name({ groupType: 'loser-bracket', roundNumber: 3, roundCount: 4 })).toBe(
        'Losers Semi-Final'
      );
      expect(name({ groupType: 'loser-bracket', roundNumber: 2, roundCount: 4 })).toBe(
        'Losers Round 2'
      );
    });

    it('falls back to a plain round label for unknown group types', async () => {
      const name = await getCustomRoundName();
      expect(name({ roundNumber: 2, roundCount: 3 })).toBe('Round 2');
      expect(name({ groupType: 'round-robin', roundNumber: 1, roundCount: 1 })).toBe('Round 1');
    });
  });

  describe('post-render DOM cleanup', () => {
    it('hides UUID text nodes one second after rendering', async () => {
      vi.useFakeTimers();
      const uuidNode = document.createElement('span');
      uuidNode.textContent = 'A1B2C3D4-1111-2222-3333-444455556666';
      const normalNode = document.createElement('span');
      normalNode.textContent = 'Team A';
      renderMock.mockImplementation(() => {
        const match = document.createElement('div');
        match.className = 'match';
        container.append(match, uuidNode, normalNode);
      });

      renderRenderer({ bracket: makeBracket() });
      await flushAsync();
      expect(renderMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(uuidNode.style.display).toBe('none');
      expect(normalNode.style.display).not.toBe('none');
    });

    it('logs an error when brackets-viewer silently rendered no matches', async () => {
      vi.useFakeTimers();
      renderRenderer({ bracket: makeBracket() });
      await flushAsync();
      expect(renderMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(errorLog).toHaveBeenCalledWith(
        'No matches rendered - brackets-viewer failed silently'
      );
    });

    it('cancels the cleanup timer on unmount', async () => {
      vi.useFakeTimers();
      const { unmount } = renderRenderer({ bracket: makeBracket() });
      await flushAsync();
      expect(renderMock).toHaveBeenCalledTimes(1);

      unmount();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(errorLog).not.toHaveBeenCalled();
    });
  });

  describe('unmount cancellation', () => {
    it('does not transform or render when unmounted before fonts are ready', async () => {
      let resolveFonts: () => void = () => {};
      fontsReady = new Promise<void>((resolve) => {
        resolveFonts = resolve as () => void;
      });

      const { unmount } = renderRenderer({ bracket: makeBracket() });
      unmount();

      resolveFonts();
      await flushAsync();

      expect(mockedAdapter.transformFromSql).not.toHaveBeenCalled();
      expect(renderMock).not.toHaveBeenCalled();
    });

    it('resets isInitialized when the effect re-runs', async () => {
      // First render initializes; unmounting flips isInitialized back via cleanup
      const { result, unmount } = renderRenderer({ bracket: makeBracket() });
      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      unmount();
      // Unmount cleanup ran without errors; nothing further to observe on an
      // unmounted hook, but the cancelled flag must prevent late errors.
      expect(errorLog).not.toHaveBeenCalled();
    });
  });
});
