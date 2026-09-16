import { onlineManager, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DuplicateRoundError } from '@/types/errors';

const mockInsertRound = vi.fn();
const mockDeleteLastRound = vi.fn();
const mockToast = vi.hoisted(() => vi.fn());

vi.mock('@/services/liveScoring/RoundService', () => ({
  RoundService: {
    insertRound: (...args: unknown[]) => mockInsertRound(...args),
    deleteLastRound: (...args: unknown[]) => mockDeleteLastRound(...args),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  toast: mockToast,
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

import type { LiveMatchBundle } from '@/services/liveScoring/LiveMatchService';

import { liveScoringKeys } from '../liveScoringKeys';
import type { SubmitRoundInput } from '../useRoundMutations';
import { useRoundMutations } from '../useRoundMutations';

const queryKey = liveScoringKeys.liveMatch('match-1');

const seedBundle = (): LiveMatchBundle =>
  ({
    match: { id: 'match-1', team1_id: 'team-1', team2_id: 'team-2' },
    games: [],
    rounds: [],
    gamePlayers: [],
  }) as unknown as LiveMatchBundle;

const submitInput = (overrides: Partial<SubmitRoundInput> = {}): SubmitRoundInput => ({
  gameId: 'game-1',
  roundNumber: 1,
  team1Score: 8,
  team2Score: 5,
  team1ThrowerId: 'p1',
  team2ThrowerId: 'p3',
  team1Bags: { bagsIn: 2, bagsOn: 2, bagsOff: 0 },
  team2Bags: { bagsIn: 1, bagsOn: 2, bagsOff: 1 },
  ...overrides,
});

let queryClient: QueryClient;

const createWrapper = () => {
  // gcTime must be non-zero: the seeded bundle has no active observer in these
  // tests and would be garbage-collected before assertions run.
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  queryClient.setQueryData(queryKey, seedBundle());
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('submitRound', () => {
  it('passes the authed user and match id to the service', async () => {
    mockInsertRound.mockResolvedValue({ id: 'round-1' });

    const { result } = renderHook(() => useRoundMutations('match-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.submitRound.mutateAsync(submitInput());
    });

    expect(mockInsertRound).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: 'match-1',
        gameId: 'game-1',
        roundNumber: 1,
        enteredByUserId: 'user-1',
      })
    );
  });

  it('optimistically appends the round with computed cancellation values', async () => {
    // Definite-assignment: the Promise executor runs synchronously.
    let resolveInsert!: (v: unknown) => void;
    mockInsertRound.mockReturnValue(new Promise((resolve) => (resolveInsert = resolve)));

    const { result } = renderHook(() => useRoundMutations('match-1'), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.submitRound.mutate(submitInput());
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<LiveMatchBundle>(queryKey);
      expect(cached?.rounds).toHaveLength(1);
      expect(cached?.rounds[0]).toMatchObject({
        round_number: 1,
        net_points: 3,
        winner_team: 1,
        entered_by_user_id: 'user-1',
      });
    });

    resolveInsert({ id: 'round-1' });
  });

  it('rolls back the optimistic round and toasts on failure', async () => {
    mockInsertRound.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useRoundMutations('match-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.submitRound.mutateAsync(submitInput()).catch(() => undefined);
    });

    expect(queryClient.getQueryData<LiveMatchBundle>(queryKey)?.rounds).toHaveLength(0);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Could not save round', variant: 'destructive' })
    );
  });

  it('treats a duplicate round as an informational conflict, not an error toast', async () => {
    mockInsertRound.mockRejectedValue(new DuplicateRoundError('game-1', 1));

    const { result } = renderHook(() => useRoundMutations('match-1'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.submitRound.mutateAsync(submitInput()).catch(() => undefined);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Round already recorded' })
    );
    const destructiveCalls = mockToast.mock.calls.filter(
      ([arg]) => (arg as { variant?: string }).variant === 'destructive'
    );
    expect(destructiveCalls).toHaveLength(0);
  });
});

describe('undoLastRound', () => {
  it('deletes the exact round and optimistically removes it from the cache', async () => {
    mockDeleteLastRound.mockResolvedValue(true);
    const wrapper = createWrapper();
    const seeded = seedBundle();
    seeded.rounds = [
      { game_id: 'game-1', round_number: 1 } as LiveMatchBundle['rounds'][number],
      { game_id: 'game-1', round_number: 2 } as LiveMatchBundle['rounds'][number],
    ];
    queryClient.setQueryData(queryKey, seeded);

    const { result } = renderHook(() => useRoundMutations('match-1'), { wrapper });

    await act(async () => {
      await result.current.undoLastRound.mutateAsync({ gameId: 'game-1', roundNumber: 2 });
    });

    expect(mockDeleteLastRound).toHaveBeenCalledWith('game-1', 2);
  });

  it('rolls back and toasts when the undo fails', async () => {
    mockDeleteLastRound.mockRejectedValue(new Error('nope'));
    const wrapper = createWrapper();
    const seeded = seedBundle();
    seeded.rounds = [{ game_id: 'game-1', round_number: 1 } as LiveMatchBundle['rounds'][number]];
    queryClient.setQueryData(queryKey, seeded);

    const { result } = renderHook(() => useRoundMutations('match-1'), { wrapper });

    await act(async () => {
      await result.current.undoLastRound
        .mutateAsync({ gameId: 'game-1', roundNumber: 1 })
        .catch(() => undefined);
    });

    expect(queryClient.getQueryData<LiveMatchBundle>(queryKey)?.rounds).toHaveLength(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Could not undo round', variant: 'destructive' })
    );
  });
});

describe('submitRound with no signal', () => {
  it('parks the round instead of failing it', async () => {
    onlineManager.setOnline(false);
    const { result } = renderHook(() => useRoundMutations('match-1'), { wrapper: createWrapper() });

    act(() => result.current.submitRound.mutate(submitInput()));

    await waitFor(() => expect(result.current.submitRound.isPaused).toBe(true));
    expect(mockInsertRound).not.toHaveBeenCalled();
    // A parked round is not a failure, so the scorer must not be told it is one.
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('still shows the round in the log while it waits', async () => {
    onlineManager.setOnline(false);
    const { result } = renderHook(() => useRoundMutations('match-1'), { wrapper: createWrapper() });

    act(() => result.current.submitRound.mutate(submitInput()));

    await waitFor(() => {
      const bundle = queryClient.getQueryData<LiveMatchBundle>(queryKey);
      expect(bundle?.rounds).toHaveLength(1);
    });
    const bundle = queryClient.getQueryData<LiveMatchBundle>(queryKey);
    expect(bundle?.rounds[0].id).toBe('optimistic-game-1-1');
  });

  it('sends it by itself when the connection returns, with nothing pressed', async () => {
    onlineManager.setOnline(false);
    mockInsertRound.mockResolvedValue({ id: 'round-1' });
    const { result } = renderHook(() => useRoundMutations('match-1'), { wrapper: createWrapper() });

    act(() => result.current.submitRound.mutate(submitInput()));
    await waitFor(() => expect(result.current.submitRound.isPaused).toBe(true));

    act(() => onlineManager.setOnline(true));

    await waitFor(() => expect(mockInsertRound).toHaveBeenCalledTimes(1));
    expect(mockInsertRound).toHaveBeenCalledWith(
      expect.objectContaining({ gameId: 'game-1', roundNumber: 1, enteredByUserId: 'user-1' })
    );
  });

  /**
   * The hook plus a live reader of the same query, so an invalidate really does
   * refetch. Without an observer the query is inactive and nothing would be
   * fetched, which is the whole of the second case below.
   */
  const renderWithLiveReader = (serverRounds: () => LiveMatchBundle['rounds']) => {
    const wrapper = createWrapper();
    return renderHook(
      () => ({
        live: useQuery({
          queryKey,
          queryFn: async () => ({ ...seedBundle(), rounds: serverRounds() }),
        }),
        rounds: useRoundMutations('match-1'),
      }),
      { wrapper }
    );
  };

  const heldRound = (roundNumber: number) =>
    queryClient
      .getQueryData<LiveMatchBundle>(queryKey)
      ?.rounds.find((round) => round.round_number === roundNumber);

  const pendingSaves = () =>
    queryClient
      .getMutationCache()
      .findAll({ mutationKey: liveScoringKeys.submitRound('match-1'), status: 'pending' });

  // Both cases below are the same fault: the handlers were written for one
  // round in flight, and a scorer can now file several while the signal is
  // gone. A round filed into the log has to stay there until its own save
  // settles, or it reads as lost at exactly the moment the scorer is checking.
  it('keeps a held round in the log when an earlier one is refused', async () => {
    const { result } = renderWithLiveReader(() => []);
    await waitFor(() => expect(result.current.live.isSuccess).toBe(true));

    onlineManager.setOnline(false);
    mockInsertRound.mockImplementation((input: { roundNumber: number }) =>
      input.roundNumber === 1
        ? Promise.reject(new Error('boom'))
        : // Round two never settles, so it is still waiting to be sent.
          new Promise(() => {})
    );

    act(() => result.current.rounds.submitRound.mutate(submitInput({ roundNumber: 1 })));
    act(() => result.current.rounds.submitRound.mutate(submitInput({ roundNumber: 2 })));
    await waitFor(() => expect(pendingSaves()).toHaveLength(2));

    act(() => onlineManager.setOnline(true));
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Could not save round' })
      )
    );

    expect(heldRound(1)).toBeUndefined();
    expect(heldRound(2)?.id).toBe('optimistic-game-1-2');
    expect(pendingSaves()).toHaveLength(1);
  });

  it('keeps a held round in the log when an earlier one is saved', async () => {
    const saved: LiveMatchBundle['rounds'] = [];
    const { result } = renderWithLiveReader(() => saved);
    await waitFor(() => expect(result.current.live.isSuccess).toBe(true));

    onlineManager.setOnline(false);
    mockInsertRound.mockImplementation((input: { roundNumber: number }) => {
      if (input.roundNumber !== 1) return new Promise(() => {});
      saved.push({
        id: 'round-1',
        game_id: 'game-1',
        round_number: 1,
      } as LiveMatchBundle['rounds'][number]);
      return Promise.resolve({ id: 'round-1' });
    });

    act(() => result.current.rounds.submitRound.mutate(submitInput({ roundNumber: 1 })));
    act(() => result.current.rounds.submitRound.mutate(submitInput({ roundNumber: 2 })));
    await waitFor(() => expect(pendingSaves()).toHaveLength(2));

    act(() => onlineManager.setOnline(true));
    await waitFor(() => expect(mockInsertRound).toHaveBeenCalledTimes(2));

    // The server has no round two yet, so a refetch here would take it out of
    // the log while the notice above still says it is waiting to send.
    await waitFor(() => expect(heldRound(2)?.id).toBe('optimistic-game-1-2'));
    expect(pendingSaves()).toHaveLength(1);
  });

  it('can hold more than one round at a time', async () => {
    onlineManager.setOnline(false);
    const { result } = renderHook(() => useRoundMutations('match-1'), { wrapper: createWrapper() });

    act(() => result.current.submitRound.mutate(submitInput({ roundNumber: 1 })));
    act(() => result.current.submitRound.mutate(submitInput({ roundNumber: 2 })));

    await waitFor(() => {
      const paused = queryClient
        .getMutationCache()
        .findAll({ mutationKey: liveScoringKeys.submitRound('match-1') })
        .filter((mutation) => mutation.state.isPaused);
      expect(paused).toHaveLength(2);
    });
  });
});
