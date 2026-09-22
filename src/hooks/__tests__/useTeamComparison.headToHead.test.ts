import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

const mockUseOpponentHistory = vi.fn();

vi.mock('@/hooks/useHeadToHead', () => ({
  useOpponentHistory: (...args: unknown[]) => mockUseOpponentHistory(...args),
}));

vi.mock('@/hooks/useTeamTotals', () => ({
  useTeamTotals: () => ({ totals: null, isLoading: false }),
}));

vi.mock('@/hooks/useLeaguePercentiles', () => ({
  useLeaguePercentiles: () => ({ getTeamPercentiles: () => null, isLoading: false }),
}));

import { useTeamComparison } from '../useTeamComparison';

const team = (id: string, name: string) => ({ id, name }) as Team;

const compare = () =>
  renderHook(() => useTeamComparison(team('a', 'Alpha'), team('b', 'Bravo'))).result.current;

describe('useTeamComparison head-to-head', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports a genuine first meeting when the read finds no rows', () => {
    mockUseOpponentHistory.mockReturnValue({ data: null, isLoading: false, error: null });

    const result = compare();

    expect(result.headToHeadError).toBe(false);
    expect(result.headToHead?.isFirstMeeting).toBe(true);
  });

  // The hook read only `data` and `isLoading`, so a failed read fell into the
  // same branch as an empty one. Two teams with a long history were told, with
  // no hint that anything had gone wrong, that they had never played.
  it('does not call a failed read a first meeting', () => {
    mockUseOpponentHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('network'),
    });

    const result = compare();

    expect(result.headToHeadError).toBe(true);
    expect(result.headToHead).toBeNull();
  });

  it('reports the record when the read succeeds', () => {
    mockUseOpponentHistory.mockReturnValue({
      data: {
        summary: {
          wins: 7,
          losses: 5,
          game_wins: 20,
          game_losses: 18,
          last_played_at: '2026-05-01',
          matches_played: 12,
        },
      },
      isLoading: false,
      error: null,
    });

    const result = compare();

    expect(result.headToHeadError).toBe(false);
    expect(result.headToHead).toMatchObject({
      team1Wins: 7,
      team2Wins: 5,
      isFirstMeeting: false,
    });
  });

  it('claims nothing while the read is still in flight', () => {
    mockUseOpponentHistory.mockReturnValue({ data: undefined, isLoading: true, error: null });

    const result = compare();

    expect(result.headToHeadError).toBe(false);
    expect(result.headToHead).toBeNull();
  });
});
