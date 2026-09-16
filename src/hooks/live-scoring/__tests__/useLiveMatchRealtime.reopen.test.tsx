import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

type ChannelHandler = (payload: { new: unknown; old: unknown }) => void;

interface CapturedOn {
  config: { event: string; schema: string; table: string; filter?: string };
  handler: ChannelHandler;
}

const capturedOns: CapturedOn[] = [];

vi.mock('@/hooks/realtime/subscribeWithRetry', () => ({
  subscribeWithRetry: (options: { build: () => unknown }) => {
    options.build();
    return { dispose: vi.fn() };
  },
}));

const mockToast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: () => {
      const chain = {
        on: (_type: string, config: CapturedOn['config'], handler: ChannelHandler) => {
          capturedOns.push({ config, handler });
          return chain;
        },
      };
      return chain;
    },
  },
}));

const mockFetchBundle = vi.fn();
const mockReopenGame = vi.fn();

vi.mock('@/services/liveScoring/LiveMatchService', () => ({
  LiveMatchService: {
    fetchLiveMatchBundle: (...args: unknown[]) => mockFetchBundle(...args),
    reopenGame: (...args: unknown[]) => mockReopenGame(...args),
    createGame: vi.fn(),
    setGamePlayers: vi.fn(),
    completeGame: vi.fn(),
  },
}));

import type { LiveMatchBundle } from '@/services/liveScoring/LiveMatchService';

import { useGameFlow } from '../useGameFlow';
import { useLiveMatch } from '../useLiveMatch';
import { useLiveMatchRealtime } from '../useLiveMatchRealtime';

const MATCH_ID = 'match-1';
const GAME_ID = 'game-1';

const bundleWith = (status: string): LiveMatchBundle =>
  ({
    match: { id: MATCH_ID } as LiveMatchBundle['match'],
    games: [{ id: GAME_ID, game_number: 2, status }] as LiveMatchBundle['games'],
    rounds: [],
    gamePlayers: [],
  }) as LiveMatchBundle;

const fireGameEcho = () => {
  const games = capturedOns.find((o) => o.config.table === 'games');
  if (!games) throw new Error('No games subscription captured');
  games.handler({
    new: { id: GAME_ID, game_number: 2, status: 'in_progress' },
    // postgres_changes carries no old row without REPLICA IDENTITY FULL, which
    // is the whole reason the previous status has to come from somewhere else.
    old: {},
  });
};

// All three hooks share one query client, exactly as the live-scoring screen
// does: the realtime subscription is mounted by the page, the match query and
// the mutations by the view beneath it.
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

/** The whole screen: the subscription, the match query and the mutations. */
const renderScreen = () =>
  renderHook(
    () => {
      useLiveMatchRealtime(MATCH_ID);
      return { match: useLiveMatch(MATCH_ID), flow: useGameFlow(MATCH_ID) };
    },
    { wrapper: createWrapper() }
  );

beforeEach(() => {
  vi.clearAllMocks();
  capturedOns.length = 0;
});

describe('reopening a game announces itself to the scorer who did it', () => {
  // The defect. The notice is raised by the live connection so every screen is
  // told once, and the reopen deliberately raises none of its own — so when the
  // live connection stays quiet, the person who pressed the button hears
  // nothing at all.
  it('tells the scorer even when their own refetch beat the live change back', async () => {
    mockFetchBundle.mockResolvedValueOnce(bundleWith('completed'));
    mockFetchBundle.mockResolvedValue(bundleWith('in_progress'));
    mockReopenGame.mockResolvedValue(undefined);

    const { result } = renderScreen();

    await waitFor(() => expect(result.current.match.bundle?.games[0].status).toBe('completed'));

    await act(async () => {
      await result.current.flow.reopenGame.mutateAsync(GAME_ID);
    });

    // onSettled's refetch has landed: the cache now reads "in progress", which
    // is what used to make the check below fail and say nothing.
    await waitFor(() => expect(result.current.match.bundle?.games[0].status).toBe('in_progress'));

    await act(async () => {
      fireGameEcho();
    });

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Game 2 reopened' }));
  });

  // The other ordering, which always worked — and must not start raising two.
  it('tells the scorer exactly once when the live change arrives first', async () => {
    mockFetchBundle.mockResolvedValue(bundleWith('completed'));
    mockReopenGame.mockResolvedValue(undefined);

    const { result } = renderScreen();

    await waitFor(() => expect(result.current.match.bundle?.games[0].status).toBe('completed'));

    await act(async () => {
      await result.current.flow.reopenGame.mutateAsync(GAME_ID);
      fireGameEcho();
    });

    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  // The note is claimed once. A later change for the same game — the next
  // round, say — must not turn it into a second notice.
  it('does not repeat the notice on a later change to the same game', async () => {
    mockFetchBundle.mockResolvedValueOnce(bundleWith('completed'));
    mockFetchBundle.mockResolvedValue(bundleWith('in_progress'));
    mockReopenGame.mockResolvedValue(undefined);

    const { result } = renderScreen();

    await waitFor(() => expect(result.current.match.bundle?.games[0].status).toBe('completed'));
    await act(async () => {
      await result.current.flow.reopenGame.mutateAsync(GAME_ID);
    });
    await waitFor(() => expect(result.current.match.bundle?.games[0].status).toBe('in_progress'));

    await act(async () => {
      fireGameEcho();
      fireGameEcho();
    });

    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  // A reopen that the database refused has nothing to announce, so the note
  // must not be left lying around for an unrelated change to pick up.
  it('says nothing when the reopen itself failed', async () => {
    mockFetchBundle.mockResolvedValueOnce(bundleWith('completed'));
    // The refetch moves the cache on, so the ordinary check cannot fire and a
    // stale note is the only thing that could still speak here.
    mockFetchBundle.mockResolvedValue(bundleWith('in_progress'));
    mockReopenGame.mockRejectedValue(new Error('refused'));

    const { result } = renderScreen();

    await waitFor(() => expect(result.current.match.bundle?.games[0].status).toBe('completed'));

    await act(async () => {
      await result.current.flow.reopenGame.mutateAsync(GAME_ID).catch(() => undefined);
    });
    await waitFor(() => expect(result.current.match.bundle?.games[0].status).toBe('in_progress'));

    mockToast.mockClear(); // the failure raises its own "Could not reopen game"

    await act(async () => {
      fireGameEcho();
    });

    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Game 2 reopened' })
    );
  });

  // A note left by one scorer must never be readable by another. Each screen
  // has its own query client, which is what keeps them apart.
  it("does not let one screen claim another screen's note", async () => {
    mockFetchBundle.mockResolvedValue(bundleWith('in_progress'));

    // A second screen that never reopened anything, watching the same match.
    const { result } = renderHook(() => useLiveMatchRealtime(MATCH_ID), {
      wrapper: createWrapper(),
    });
    expect(result.current).toBeDefined();

    await act(async () => {
      fireGameEcho();
    });

    // Its own cache says the game was already in progress, so this is a game
    // merely carrying on, not a reopen.
    expect(mockToast).not.toHaveBeenCalled();
  });
});
