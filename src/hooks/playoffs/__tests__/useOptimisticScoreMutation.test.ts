import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOptimisticScoreMutation } from '../useOptimisticScoreMutation';

const mockToast = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/logger', () => ({
  scoreLog: vi.fn(),
  errorLog: vi.fn(),
}));

const BRACKET_ID = 'bracket-xyz';
const MATCH_ID = '99';

const makeBmMatch = (overrides = {}) => ({
  id: 99,
  opponent1_id: 'team-a',
  opponent2_id: 'team-b',
  opponent1_score: 0,
  opponent2_score: 0,
  status: 2,
  ...overrides,
});

const OTHER_MATCH_ID = '100';

const makeOtherBmMatch = (overrides = {}) => ({
  id: 100,
  opponent1_id: 'team-c',
  opponent2_id: 'team-d',
  opponent1_score: 7,
  opponent2_score: 6,
  status: 2,
  ...overrides,
});

const scoresById = () => {
  const data = queryClient.getQueryData<{
    matches: { id: number; opponent1_score: number | null }[];
  }>(['bracket-data', BRACKET_ID]);
  return Object.fromEntries(
    (data?.matches ?? []).map((match) => [String(match.id), match.opponent1_score])
  );
};

const makeLegacyMatch = (overrides = {}) => ({
  id: 99,
  team1Score: 0,
  team2Score: 0,
  winnerId: null,
  winner_id: null,
  status: 'pending',
  ...overrides,
});

let queryClient: QueryClient;

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useOptimisticScoreMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is a no-op when bracketId is null', () => {
    queryClient.setQueryData(['bracket-data', BRACKET_ID], { matches: [makeBmMatch()] });
    const { result } = renderHook(() => useOptimisticScoreMutation(null), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.applyOptimisticUpdate(MATCH_ID, 2, 1, 2, 1, 'team-a', 'team-b');
    });

    // Cache unchanged since bracketId is null
    const data = queryClient.getQueryData<{ matches: unknown[] }>(['bracket-data', BRACKET_ID]);
    expect((data?.matches[0] as { opponent1_score: number }).opponent1_score).toBe(0);
  });

  it('applies optimistic update to brackets-manager format', () => {
    queryClient.setQueryData(['bracket-data', BRACKET_ID], { matches: [makeBmMatch()] });
    const { result } = renderHook(() => useOptimisticScoreMutation(BRACKET_ID), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.applyOptimisticUpdate(MATCH_ID, 2, 1, 2, 1, 'team-a', 'team-b');
    });

    const data = queryClient.getQueryData<{
      matches: { opponent1_score: number; opponent2_score: number; status: number }[];
    }>(['bracket-data', BRACKET_ID]);
    expect(data?.matches[0].opponent1_score).toBe(2);
    expect(data?.matches[0].opponent2_score).toBe(1);
    expect(data?.matches[0].status).toBe(4); // completed in BM
  });

  it('applies optimistic update to legacy format', () => {
    queryClient.setQueryData(['bracket-data', BRACKET_ID], { matches: [makeLegacyMatch()] });
    const { result } = renderHook(() => useOptimisticScoreMutation(BRACKET_ID), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.applyOptimisticUpdate(MATCH_ID, 2, 1, 2, 1, 'team-a', 'team-b');
    });

    const data = queryClient.getQueryData<{
      matches: { team1Score: number; team2Score: number; winnerId: string }[];
    }>(['bracket-data', BRACKET_ID]);
    expect(data?.matches[0].team1Score).toBe(2);
    expect(data?.matches[0].team2Score).toBe(1);
    expect(data?.matches[0].winnerId).toBe('team-a'); // team1GameWins > team2GameWins
  });

  it('rollback restores original cache values', () => {
    queryClient.setQueryData(['bracket-data', BRACKET_ID], {
      matches: [makeBmMatch({ opponent1_score: 5, opponent2_score: 3, status: 4 })],
    });
    const { result } = renderHook(() => useOptimisticScoreMutation(BRACKET_ID), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.applyOptimisticUpdate(MATCH_ID, 2, 1, 2, 1, 'team-a', 'team-b');
    });

    act(() => {
      result.current.rollback(MATCH_ID);
    });

    const data = queryClient.getQueryData<{
      matches: { opponent1_score: number | null; status: number }[];
    }>(['bracket-data', BRACKET_ID]);
    expect(data?.matches[0].opponent1_score).toBe(5);
    expect(data?.matches[0].status).toBe(4);
  });

  it('rollback restores a Running (3) status instead of collapsing it to Ready (2)', () => {
    // Rollback must put back exactly what was snapshotted. Statuses other than
    // Ready(2)/Completed(4) — here Running(3) — are the ones a two-way
    // completed-or-not choice silently rewrites.
    queryClient.setQueryData(['bracket-data', BRACKET_ID], {
      matches: [makeBmMatch({ opponent1_score: 1, opponent2_score: 1, status: 3 })],
    });
    const { result } = renderHook(() => useOptimisticScoreMutation(BRACKET_ID), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.applyOptimisticUpdate(MATCH_ID, 2, 1, 2, 1, 'team-a', 'team-b');
    });

    act(() => {
      result.current.rollback(MATCH_ID);
    });

    const data = queryClient.getQueryData<{ matches: { status: number }[] }>([
      'bracket-data',
      BRACKET_ID,
    ]);
    expect(data?.matches[0].status).toBe(3);
  });

  it('onError calls rollback and shows destructive toast', () => {
    queryClient.setQueryData(['bracket-data', BRACKET_ID], { matches: [makeBmMatch()] });
    const { result } = renderHook(() => useOptimisticScoreMutation(BRACKET_ID), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.applyOptimisticUpdate(MATCH_ID, 2, 1, 2, 1, 'team-a', 'team-b');
    });

    act(() => {
      result.current.onError(new Error('Save failed'), MATCH_ID);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Update Failed', variant: 'destructive' })
    );
    // Cache should be restored
    const data = queryClient.getQueryData<{ matches: { opponent1_score: number }[] }>([
      'bracket-data',
      BRACKET_ID,
    ]);
    expect(data?.matches[0].opponent1_score).toBe(0);
  });

  it('onSuccess clears timeout so no rollback fires after success', () => {
    vi.useFakeTimers();
    // Use Infinity gcTime so fake timer advancement doesn't evict cache entries
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    queryClient.setQueryData(['bracket-data', BRACKET_ID], { matches: [makeBmMatch()] });
    const { result } = renderHook(() => useOptimisticScoreMutation(BRACKET_ID), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.applyOptimisticUpdate(MATCH_ID, 2, 1, 2, 1, 'team-a', 'team-b');
    });
    act(() => {
      result.current.onSuccess(MATCH_ID);
    });

    // Advance past the 15s timeout — no rollback toast should fire
    act(() => {
      vi.advanceTimersByTime(20000);
    });

    expect(mockToast).not.toHaveBeenCalled();
    const data = queryClient.getQueryData<{ matches: { opponent1_score: number }[] }>([
      'bracket-data',
      BRACKET_ID,
    ]);
    expect(data?.matches[0].opponent1_score).toBe(2); // still updated
  });

  it('fires rollback toast after 15 second timeout', () => {
    vi.useFakeTimers();
    // Use Infinity gcTime so fake timer advancement doesn't evict cache entries
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    queryClient.setQueryData(['bracket-data', BRACKET_ID], { matches: [makeBmMatch()] });
    const { result } = renderHook(() => useOptimisticScoreMutation(BRACKET_ID), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.applyOptimisticUpdate(MATCH_ID, 2, 1, 2, 1, 'team-a', 'team-b');
    });

    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Update Timeout', variant: 'destructive' })
    );
    // Cache should be restored to original 0
    const data = queryClient.getQueryData<{ matches: { opponent1_score: number }[] }>([
      'bracket-data',
      BRACKET_ID,
    ]);
    expect(data?.matches[0].opponent1_score).toBe(0);
  });

  /**
   * Saves overlap in practice: handleSaveMatchScore closes the editor before
   * awaiting the network call, so an admin can start saving a second match while
   * the first is still in flight. Rollback state must therefore be per-match — a
   * single shared snapshot lets one save destroy another's ability to undo itself.
   */
  describe('overlapping saves', () => {
    const applyBoth = (result: { current: ReturnType<typeof useOptimisticScoreMutation> }) => {
      act(() => {
        result.current.applyOptimisticUpdate(MATCH_ID, 2, 1, 2, 1, 'team-a', 'team-b');
      });
      act(() => {
        result.current.applyOptimisticUpdate(OTHER_MATCH_ID, 3, 1, 3, 1, 'team-c', 'team-d');
      });
    };

    it('confirming the first save leaves the second able to roll itself back', () => {
      queryClient.setQueryData(['bracket-data', BRACKET_ID], {
        matches: [makeBmMatch({ opponent1_score: 5 }), makeOtherBmMatch()],
      });
      const { result } = renderHook(() => useOptimisticScoreMutation(BRACKET_ID), {
        wrapper: createWrapper(),
      });

      applyBoth(result);
      act(() => {
        result.current.onSuccess(MATCH_ID);
      });
      act(() => {
        result.current.onError(new Error('Save failed'), OTHER_MATCH_ID);
      });

      // 100 goes back to its pre-save 7; 99 keeps the value its successful save wrote.
      expect(scoresById()).toEqual({ '99': 2, '100': 7 });
    });

    it('confirming the first save leaves the second timeout armed', () => {
      vi.useFakeTimers();
      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      queryClient.setQueryData(['bracket-data', BRACKET_ID], {
        matches: [makeBmMatch({ opponent1_score: 5 }), makeOtherBmMatch()],
      });
      const { result } = renderHook(() => useOptimisticScoreMutation(BRACKET_ID), {
        wrapper: createWrapper(),
      });

      applyBoth(result);
      act(() => {
        result.current.onSuccess(MATCH_ID);
      });
      act(() => {
        vi.advanceTimersByTime(15000);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Update Timeout', variant: 'destructive' })
      );
      expect(scoresById()).toEqual({ '99': 2, '100': 7 });
    });

    it('rolling back one save leaves the other optimistic update intact', () => {
      queryClient.setQueryData(['bracket-data', BRACKET_ID], {
        matches: [makeBmMatch({ opponent1_score: 5 }), makeOtherBmMatch()],
      });
      const { result } = renderHook(() => useOptimisticScoreMutation(BRACKET_ID), {
        wrapper: createWrapper(),
      });

      applyBoth(result);
      act(() => {
        result.current.onError(new Error('Save failed'), MATCH_ID);
      });

      expect(scoresById()).toEqual({ '99': 5, '100': 3 });
    });

    it('drops pending rollback timers when the hook unmounts', () => {
      vi.useFakeTimers();
      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      queryClient.setQueryData(['bracket-data', BRACKET_ID], {
        matches: [makeBmMatch({ opponent1_score: 5 }), makeOtherBmMatch()],
      });
      const { result, unmount } = renderHook(() => useOptimisticScoreMutation(BRACKET_ID), {
        wrapper: createWrapper(),
      });

      applyBoth(result);
      unmount();
      act(() => {
        vi.advanceTimersByTime(20000);
      });

      // Navigating away must not fire a destructive toast or rewrite the cache for
      // a screen that is gone.
      expect(mockToast).not.toHaveBeenCalled();
      expect(scoresById()).toEqual({ '99': 2, '100': 3 });
    });

    it('a match missing from the cache does not roll back a different match', () => {
      // No snapshot can be taken for a match that is not cached. That must mean
      // "nothing to undo", not "undo whatever was snapshotted last".
      queryClient.setQueryData(['bracket-data', BRACKET_ID], {
        matches: [makeBmMatch({ opponent1_score: 5 })],
      });
      const { result } = renderHook(() => useOptimisticScoreMutation(BRACKET_ID), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.applyOptimisticUpdate(MATCH_ID, 2, 1, 2, 1, 'team-a', 'team-b');
      });
      act(() => {
        result.current.applyOptimisticUpdate('404', 9, 1, 9, 1, 'team-x', 'team-y');
      });
      act(() => {
        result.current.rollback('404');
      });

      expect(scoresById()).toEqual({ '99': 2 });
    });
  });
});
