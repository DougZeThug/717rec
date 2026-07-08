import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
