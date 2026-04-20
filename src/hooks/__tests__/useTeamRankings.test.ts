import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTeamRankings } from '../useTeamRankings';

vi.mock('@/hooks/rankings/usePreviousRankings', () => ({
  usePreviousRankings: vi.fn(),
}));

vi.mock('@/hooks/rankings/useRankingsData', () => ({
  useRankingsData: vi.fn(),
}));

vi.mock('@/hooks/useTeams', () => ({
  useTeams: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
}));

vi.mock('@/utils/rankingUtils', () => ({
  updateRankChanges: vi.fn((rankings: unknown[]) => rankings),
}));

vi.mock('@/utils/rankingUtils/calculateStreak', () => ({
  calculateStreak: vi.fn(() => 'W2'),
}));

import { usePreviousRankings } from '@/hooks/rankings/usePreviousRankings';
import { useRankingsData } from '@/hooks/rankings/useRankingsData';
import { useTeams } from '@/hooks/useTeams';

const makeTeam = (id: string, powerScore: number | null = 80) =>
  ({
    id,
    name: `Team ${id}`,
    wins: 3,
    losses: 1,
    game_wins: 9,
    game_losses: 3,
    win_percentage: 0.75,
    game_win_percentage: 0.75,
    sos: 0.5,
    power_score: powerScore,
    divisionName: 'Division A',
    imageUrl: null,
    logoUrl: null,
    close_match_losses: 0,
  }) as any;

describe('useTeamRankings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (usePreviousRankings as ReturnType<typeof vi.fn>).mockReturnValue({
      previousRankings: {},
      lastUpdated: null,
    });
    (useRankingsData as ReturnType<typeof vi.fn>).mockReturnValue({
      latestMatches: [],
      matchesLoading: false,
    });
    (useTeams as ReturnType<typeof vi.fn>).mockReturnValue({
      teams: [],
      isLoading: false,
    });
  });

  it('returns isLoading=true while teams are still loading', () => {
    (useTeams as ReturnType<typeof vi.fn>).mockReturnValue({
      teams: [],
      isLoading: true,
    });
    const { result } = renderHook(() => useTeamRankings());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns empty rankings when no teams', async () => {
    const { result } = renderHook(() => useTeamRankings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rankings).toEqual([]);
  });

  it('builds rankings from loaded teams sorted by power score descending', async () => {
    (useTeams as ReturnType<typeof vi.fn>).mockReturnValue({
      teams: [makeTeam('b', 60), makeTeam('a', 90), makeTeam('c', 75)],
      isLoading: false,
    });
    const { result } = renderHook(() => useTeamRankings());
    await waitFor(() => expect(result.current.rankings.length).toBeGreaterThan(0));
    const scores = result.current.rankings.map((r) => r.powerScore);
    expect(scores[0]).toBeGreaterThanOrEqual(scores[1]);
    expect(scores[1]).toBeGreaterThanOrEqual(scores[2]);
  });

  it('sorts teams with null power scores to the end', async () => {
    (useTeams as ReturnType<typeof vi.fn>).mockReturnValue({
      teams: [makeTeam('no-score', null), makeTeam('has-score', 80)],
      isLoading: false,
    });
    const { result } = renderHook(() => useTeamRankings());
    await waitFor(() => expect(result.current.rankings.length).toBe(2));
    expect(result.current.rankings[0].teamId).toBe('has-score');
    expect(result.current.rankings[1].teamId).toBe('no-score');
  });

  it('uses provided teams prop instead of internal useTeams data', async () => {
    const customTeams = [makeTeam('custom-1', 95)];
    const { result } = renderHook(() => useTeamRankings(customTeams));
    await waitFor(() => expect(result.current.rankings.length).toBe(1));
    expect(result.current.rankings[0].teamId).toBe('custom-1');
  });
});
