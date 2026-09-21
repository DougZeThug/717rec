import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

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
  saveRankingsToStorage: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/utils/rankingUtils/calculateStreak', () => ({
  calculateStreak: vi.fn(() => 'W2'),
}));

import { usePreviousRankings } from '@/hooks/rankings/usePreviousRankings';
import { useRankingsData } from '@/hooks/rankings/useRankingsData';
import { useTeams } from '@/hooks/useTeams';
import { saveRankingsToStorage } from '@/utils/rankingUtils';
import { calculateStreak } from '@/utils/rankingUtils/calculateStreak';

const makeTeam = (id: string, powerScore: number | null = 80, overrides: Partial<Team> = {}) =>
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
    ...overrides,
  }) as unknown as Team;

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

  // The warm mount: a return visit inside the 5-minute staleTime, where the
  // teams and matches queries answer from cache. Rankings are still derived in
  // an effect, so the first commit has none -- and reporting that as "loaded,
  // and empty" made StatsContainer commit its no-teams panel over a full
  // league, then swap it for the real table a moment later.
  it('never reports a populated league as loaded and empty', async () => {
    (useTeams as ReturnType<typeof vi.fn>).mockReturnValue({
      teams: [makeTeam('a', 90), makeTeam('b', 60)],
      isLoading: false,
    });

    const commits: Array<{ count: number; loading: boolean }> = [];
    const { result } = renderHook(() => {
      const value = useTeamRankings();
      commits.push({ count: value.rankings.length, loading: value.isLoading });
      return value;
    });

    await waitFor(() => expect(result.current.rankings.length).toBe(2));

    // "Not loading, and nothing to show" is what draws the empty state.
    expect(commits.some((c) => c.count === 0 && !c.loading)).toBe(false);
    expect(commits[0].loading).toBe(true);
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
    const scores = result.current.rankings.map((r) => r.powerScore ?? -Infinity);
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

  it('uses division before win percentage when displayed power scores tie', async () => {
    (useTeams as ReturnType<typeof vi.fn>).mockReturnValue({
      teams: [
        makeTeam('smooth', 60.44, {
          name: 'Smooth Sliders',
          divisionName: 'Intermediate',
          win_percentage: 0.667,
        }),
        makeTeam('cheesers', 60.41, {
          name: 'Pepperoni Cheesers',
          divisionName: 'Competitive',
          win_percentage: 0.417,
        }),
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useTeamRankings());
    await waitFor(() => expect(result.current.rankings.length).toBe(2));

    expect(result.current.rankings.map((ranking) => ranking.teamId)).toEqual([
      'cheesers',
      'smooth',
    ]);
  });

  // This hook's default order is a second, hand-rolled copy of sortRankings'
  // tiebreaker chain, so the same cases have to hold in both places. Only the
  // division step was pinned here before; a regression in the rest would have
  // misordered the standings silently.
  it('ties rows the table prints the same, even across a .x5 boundary', async () => {
    // Both print "41.6". The old Math.round rounding made the first 41.7,
    // which skipped the tiebreakers and put Recreational above Competitive.
    (useTeams as ReturnType<typeof vi.fn>).mockReturnValue({
      teams: [
        makeTeam('rec', 41.65, {
          name: 'Alpha',
          divisionName: 'Recreational',
          win_percentage: 0.9,
        }),
        makeTeam('comp', 41.6, {
          name: 'Zulu',
          divisionName: 'Competitive',
          win_percentage: 0.1,
        }),
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useTeamRankings());
    await waitFor(() => expect(result.current.rankings.length).toBe(2));

    expect(result.current.rankings.map((r) => r.teamId)).toEqual(['comp', 'rec']);
  });

  it('breaks a displayed tie by win percentage, then by name', async () => {
    (useTeams as ReturnType<typeof vi.fn>).mockReturnValue({
      teams: [
        makeTeam('zulu', 70, {
          name: 'Zulu',
          divisionName: 'Competitive',
          win_percentage: 0.5,
        }),
        makeTeam('alpha', 70, {
          name: 'Alpha',
          divisionName: 'Competitive',
          win_percentage: 0.5,
        }),
        makeTeam('winner', 70, {
          name: 'Winner',
          divisionName: 'Competitive',
          win_percentage: 0.8,
        }),
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useTeamRankings());
    await waitFor(() => expect(result.current.rankings.length).toBe(3));

    // Same division and same displayed score, so win % leads; the two teams
    // level on win % fall through to the name.
    expect(result.current.rankings.map((r) => r.teamId)).toEqual(['winner', 'alpha', 'zulu']);
  });

  it('orders teams with no power score by division, then win percentage, then name', async () => {
    (useTeams as ReturnType<typeof vi.fn>).mockReturnValue({
      teams: [
        makeTeam('rec', null, {
          name: 'Aardvark',
          divisionName: 'Recreational',
          win_percentage: 0.9,
        }),
        makeTeam('comp-bravo', null, {
          name: 'Bravo',
          divisionName: 'Competitive',
          win_percentage: 0.5,
        }),
        makeTeam('comp-alpha', null, {
          name: 'Alpha',
          divisionName: 'Competitive',
          win_percentage: 0.5,
        }),
        makeTeam('comp-winner', null, {
          name: 'Zulu',
          divisionName: 'Competitive',
          win_percentage: 0.8,
        }),
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useTeamRankings());
    await waitFor(() => expect(result.current.rankings.length).toBe(4));

    // Competitive before Recreational despite the Recreational team holding
    // the best record; within Competitive, win % then name.
    expect(result.current.rankings.map((r) => r.teamId)).toEqual([
      'comp-winner',
      'comp-alpha',
      'comp-bravo',
      'rec',
    ]);
  });

  it('falls back to an empty table when the calculation throws', async () => {
    // Anything throwing inside the build — here the streak helper — must leave
    // the table empty and stop loading rather than render half a ranking.
    (useTeams as ReturnType<typeof vi.fn>).mockReturnValue({
      teams: [makeTeam('boom-1', 90), makeTeam('boom-2', 80)],
      isLoading: false,
    });
    // Once, not a lasting implementation: clearAllMocks resets calls but keeps
    // implementations, so a permanent throw here would leak into later tests.
    (calculateStreak as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('streak blew up');
    });

    const { result } = renderHook(() => useTeamRankings());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rankings).toEqual([]);
  });

  it('never persists snapshots as a side effect of rendering (pure read)', async () => {
    (useTeams as ReturnType<typeof vi.fn>).mockReturnValue({
      teams: [makeTeam('persist-1', 88), makeTeam('persist-2', 77)],
      isLoading: false,
    });

    const { result } = renderHook(() => useTeamRankings());

    await waitFor(() => expect(result.current.rankings.length).toBe(2));
    expect(saveRankingsToStorage).not.toHaveBeenCalled();
  });

  it('propagates a teams fetch error', () => {
    const teamsError = new Error('teams down');
    (useTeams as ReturnType<typeof vi.fn>).mockReturnValue({
      teams: [],
      isLoading: false,
      error: teamsError,
      fetchTeams: vi.fn(),
    });
    const { result } = renderHook(() => useTeamRankings());
    expect(result.current.error).toBe(teamsError);
  });

  it('propagates a matches fetch error', () => {
    const matchesError = new Error('matches down');
    (useRankingsData as ReturnType<typeof vi.fn>).mockReturnValue({
      latestMatches: [],
      matchesLoading: false,
      matchesError,
      refetchMatches: vi.fn(),
    });
    const { result } = renderHook(() => useTeamRankings());
    expect(result.current.error).toBe(matchesError);
  });

  it('refetch triggers both data sources', () => {
    const fetchTeams = vi.fn();
    const refetchMatches = vi.fn();
    (useTeams as ReturnType<typeof vi.fn>).mockReturnValue({
      teams: [],
      isLoading: false,
      error: null,
      fetchTeams,
    });
    (useRankingsData as ReturnType<typeof vi.fn>).mockReturnValue({
      latestMatches: [],
      matchesLoading: false,
      matchesError: null,
      refetchMatches,
    });
    const { result } = renderHook(() => useTeamRankings());
    result.current.refetch();
    expect(fetchTeams).toHaveBeenCalledTimes(1);
    expect(refetchMatches).toHaveBeenCalledTimes(1);
  });
});
