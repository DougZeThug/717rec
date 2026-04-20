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
    const data = queryClient.getQueryData<{ matches: unknown[] }>([
      'bracket-data',
      BRACKET_ID,
    ]);
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

    const data = queryClient.getQueryData<{ matches: { opponent1_score: number; opponent2_score: number; status: number }[] }>(['bracket-data', BRACKET_ID]);
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

    const data = queryClient.getQueryData<{ matches: { team1Score: number; team2Score: number; winnerId: string }[] }>(['bracket-data', BRACKET_ID]);
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
      result.current.rollback();
    });

    const data = queryClient.getQueryData<{ matches: { opponent1_score: number | null }[] }>(['bracket-data', BRACKET_ID]);
    expect(data?.matches[0].opponent1_score).toBe(5);
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
      result.current.onError(new Error('Save failed'));
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Update Failed', variant: 'destructive' })
    );
    // Cache should be restored
    const data = queryClient.getQueryData<{ matches: { opponent1_score: number }[] }>(['bracket-data', BRACKET_ID]);
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
      result.current.onSuccess();
    });

    // Advance past the 15s timeout — no rollback toast should fire
    act(() => { vi.advanceTimersByTime(20000); });

    expect(mockToast).not.toHaveBeenCalled();
    const data = queryClient.getQueryData<{ matches: { opponent1_score: number }[] }>(['bracket-data', BRACKET_ID]);
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

    act(() => { vi.advanceTimersByTime(15000); });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Update Timeout', variant: 'destructive' })
    );
    // Cache should be restored to original 0
    const data = queryClient.getQueryData<{ matches: { opponent1_score: number }[] }>(['bracket-data', BRACKET_ID]);
    expect(data?.matches[0].opponent1_score).toBe(0);
  });
});
