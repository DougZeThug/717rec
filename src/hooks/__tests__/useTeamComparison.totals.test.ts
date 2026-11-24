import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

const mockTotals = vi.fn();

vi.mock('@/hooks/useHeadToHead', () => ({
  useOpponentHistory: () => ({ data: null, isLoading: false, error: null }),
}));

vi.mock('@/hooks/career/useTeamTotalsComputed', () => ({
  useTeamTotalsComputed: (teamId: string) => mockTotals(teamId),
}));

vi.mock('@/hooks/useLeaguePercentiles', () => ({
  useLeaguePercentiles: () => ({ getTeamPercentiles: () => null, isLoading: false }),
}));

import { useTeamComparison } from '../useTeamComparison';

const team = (id: string, name: string) => ({ id, name }) as Team;

const goodTotals = { career_match_wins: 4, career_match_losses: 1 };

const compare = () =>
  renderHook(() => useTeamComparison(team('a', 'Alpha'), team('b', 'Bravo'))).result.current;

describe('useTeamComparison career totals', () => {
  const refetchA = vi.fn();
  const refetchB = vi.fn();

  const setReads = (a: object, b: object) =>
    mockTotals.mockImplementation((id: string) =>
      id === 'a'
        ? { isLoading: false, error: null, refetch: refetchA, ...a }
        : { isLoading: false, error: null, refetch: refetchB, ...b }
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports no error when both reads worked', () => {
    setReads({ totals: goodTotals }, { totals: goodTotals });

    const result = compare();

    expect(result.totalsError).toBe(false);
    expect(result.team1?.winPct).toBe(80);
  });

  it('reports an error when one team has no totals because the read failed', () => {
    setReads({ totals: goodTotals }, { totals: undefined, error: new Error('down') });

    expect(compare().totalsError).toBe(true);
  });

  it('keeps the old numbers when a later refresh fails', () => {
    setReads({ totals: goodTotals, error: new Error('refresh') }, { totals: goodTotals });

    expect(compare().totalsError).toBe(false);
  });

  it('retries only the reads that failed', () => {
    setReads({ totals: goodTotals }, { totals: undefined, error: new Error('down') });

    compare().retryTotals();

    expect(refetchB).toHaveBeenCalledTimes(1);
    expect(refetchA).not.toHaveBeenCalled();
  });

  it('does not retry the second team when only the first read failed', () => {
    setReads({ totals: undefined, error: new Error('down') }, { totals: goodTotals });

    compare().retryTotals();

    expect(refetchA).toHaveBeenCalledTimes(1);
    expect(refetchB).not.toHaveBeenCalled();
  });

  it('retries both reads when both failed', () => {
    setReads(
      { totals: undefined, error: new Error('a') },
      { totals: undefined, error: new Error('b') }
    );

    compare().retryTotals();

    expect(refetchA).toHaveBeenCalledTimes(1);
    expect(refetchB).toHaveBeenCalledTimes(1);
  });
});
