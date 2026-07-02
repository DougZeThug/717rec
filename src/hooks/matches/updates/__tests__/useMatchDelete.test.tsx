import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match, Team } from '@/types';

const { mockDeleteMatchWithStatsReversal, mockToast, mockInvalidateAllDataQueries } = vi.hoisted(
  () => ({
    mockDeleteMatchWithStatsReversal: vi.fn(),
    mockToast: vi.fn(),
    mockInvalidateAllDataQueries: vi.fn(),
  })
);

vi.mock('@/services/matches/MatchWriteService', () => ({
  deleteMatchWithStatsReversal: mockDeleteMatchWithStatsReversal,
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('../utils/queryInvalidation', () => ({
  invalidateAllDataQueries: mockInvalidateAllDataQueries,
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

import { useMatchDelete } from '../useMatchDelete';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const matchA = { id: 'match-a', team1Id: 't1', team2Id: 't2' } as unknown as Match;
const matchB = { id: 'match-b', team1Id: 't3', team2Id: 't4' } as unknown as Match;
const teams: Team[] = [];

describe('useMatchDelete', () => {
  let setMatches: Mock<(matches: Match[]) => void>;
  let setDeleteMatchId: Mock<(id: string | null) => void>;
  let setIsDeleting: Mock<(isDeleting: boolean) => void>;

  const renderDelete = (deleteMatchId: string | null, matches: Match[] = [matchA, matchB]) =>
    renderHook(
      () =>
        useMatchDelete({
          matches,
          setMatches,
          deleteMatchId,
          setDeleteMatchId,
          setIsDeleting,
        }),
      { wrapper }
    );

  beforeEach(() => {
    vi.clearAllMocks();
    setMatches = vi.fn();
    setDeleteMatchId = vi.fn();
    setIsDeleting = vi.fn();
    mockDeleteMatchWithStatsReversal.mockResolvedValue(undefined);
  });

  it('returns false and does nothing when no match is selected for deletion', async () => {
    const { result } = renderDelete(null);

    let outcome = true;
    await act(async () => {
      outcome = await result.current.handleDeleteMatch(teams);
    });

    expect(outcome).toBe(false);
    expect(mockDeleteMatchWithStatsReversal).not.toHaveBeenCalled();
    expect(setIsDeleting).not.toHaveBeenCalled();
  });

  it('deletes the match, removes it from state, clears selection and invalidates queries', async () => {
    const { result } = renderDelete('match-a');

    let outcome = false;
    await act(async () => {
      outcome = await result.current.handleDeleteMatch(teams);
    });

    expect(outcome).toBe(true);
    expect(mockDeleteMatchWithStatsReversal).toHaveBeenCalledWith('match-a');
    expect(setMatches).toHaveBeenCalledWith([matchB]);
    expect(setDeleteMatchId).toHaveBeenCalledWith(null);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Match Deleted', variant: 'destructive' })
    );
    expect(mockInvalidateAllDataQueries).toHaveBeenCalledTimes(1);
    // isDeleting toggled on then off
    expect(setIsDeleting).toHaveBeenNthCalledWith(1, true);
    expect(setIsDeleting).toHaveBeenLastCalledWith(false);
  });

  it('returns false with an error toast when the selected match is not in state', async () => {
    const { result } = renderDelete('missing-match');

    let outcome = true;
    await act(async () => {
      outcome = await result.current.handleDeleteMatch(teams);
    });

    expect(outcome).toBe(false);
    expect(mockDeleteMatchWithStatsReversal).not.toHaveBeenCalled();
    expect(setMatches).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: 'Failed to delete match: Match not found',
        variant: 'destructive',
      })
    );
    expect(setIsDeleting).toHaveBeenLastCalledWith(false);
  });

  it('returns false and surfaces the service error message when the delete throws', async () => {
    mockDeleteMatchWithStatsReversal.mockRejectedValue(new Error('rpc exploded'));
    const { result } = renderDelete('match-a');

    let outcome = true;
    await act(async () => {
      outcome = await result.current.handleDeleteMatch(teams);
    });

    expect(outcome).toBe(false);
    expect(setMatches).not.toHaveBeenCalled();
    expect(setDeleteMatchId).not.toHaveBeenCalled();
    expect(mockInvalidateAllDataQueries).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: 'Failed to delete match: rpc exploded',
      })
    );
    expect(setIsDeleting).toHaveBeenLastCalledWith(false);
  });

  it('handles non-Error rejections with a generic message', async () => {
    mockDeleteMatchWithStatsReversal.mockRejectedValue('string failure');
    const { result } = renderDelete('match-a');

    await act(async () => {
      await result.current.handleDeleteMatch(teams);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Failed to delete match: Unknown error' })
    );
  });
});
