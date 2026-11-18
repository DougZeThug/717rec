import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';
import type { TeamTotals } from '@/utils/career/types';

const mockUseTeamsQuery = vi.fn();
const mockUseQuery = vi.fn();

vi.mock('@/hooks/teams', () => ({
  useTeamsQuery: (options: unknown) => mockUseTeamsQuery(options),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

// useQuery is mocked above, so the query function does not run by itself. This
// keeps the real module — and the Supabase client it imports — out of the file.
// Only the last test takes the query function and runs it, with the totals it
// sets here. The path must be the alias; a relative one resolves against this
// test's own directory and silently matches nothing.
vi.mock('@/services/career/computeAllTeamsTotals', () => ({
  computeAllTeamsTotals: vi.fn(),
}));

import { computeAllTeamsTotals } from '@/services/career/computeAllTeamsTotals';

import { useCareerRankings } from '../useCareerRankings';

describe('useCareerRankings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  // Raised in review of the B-36 fix: the rankings query is disabled until the
  // team list arrives, so it can never report the team fetch's own failure. Its
  // error stayed null and its data stayed undefined, which every consumer read
  // as an empty league — the report card and the GPA leaderboard both said
  // "not enough data" when the request had in fact failed.
  it('reports the team fetch failure that disables its own query', () => {
    const teamsError = new Error('teams down');
    mockUseTeamsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: teamsError,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useCareerRankings());

    expect(result.current.error).toBe(teamsError);
    // The query it wraps saw nothing at all.
    expect(mockUseQuery.mock.calls[0][0].enabled).toBe(false);
  });

  it('flags isError, not just error, when the prerequisite fails', () => {
    // Spreading the query alone left `error` set while `isError` stayed false,
    // so a consumer reading the standard flag would miss the failure.
    mockUseTeamsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('teams down'),
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useCareerRankings());

    expect(result.current.isError).toBe(true);
  });

  it('does not refetch its disabled query when the team refetch fails again', async () => {
    const refetchQuery = vi.fn().mockResolvedValue({});
    mockUseTeamsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('teams down'),
      // Still failing on retry.
      refetch: vi.fn().mockResolvedValue({ error: new Error('teams still down') }),
    });
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: refetchQuery,
    });

    const { result } = renderHook(() => useCareerRankings());
    await result.current.refetch();

    // That query is disabled while the team list is missing, so refetching it
    // would resolve with the stale empty state and read as a success.
    expect(refetchQuery).not.toHaveBeenCalled();
  });

  it('retries the team query, not only its own', async () => {
    const refetchTeams = vi.fn().mockResolvedValue({});
    const refetchQuery = vi.fn().mockResolvedValue({});
    mockUseTeamsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('teams down'),
      refetch: refetchTeams,
    });
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: refetchQuery,
    });

    const { result } = renderHook(() => useCareerRankings());
    await result.current.refetch();

    // Retrying only its own query could never recover: that query is disabled
    // until the team list is back.
    expect(refetchTeams).toHaveBeenCalled();
  });

  it('is still loading while its prerequisite is', () => {
    mockUseTeamsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useCareerRankings());

    // A disabled query reports isLoading false, which read as "loaded, empty"
    // and flashed the no-data message while the teams were still arriving.
    expect(result.current.isLoading).toBe(true);
  });

  // Raised in review: the custom refetch used to hand back the stale rankings
  // result, which reported no error, so an awaiting caller read a failed retry
  // as a success. It resolves with nothing now — the failure is read from
  // `error`, which is the one channel that reports both this query's failure
  // and its prerequisite's.
  it('resolves its retry with nothing rather than a result that hides the failure', async () => {
    mockUseTeamsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('teams down'),
      refetch: vi.fn().mockResolvedValue({ error: new Error('teams still down') }),
    });

    const { result } = renderHook(() => useCareerRankings());

    await expect(result.current.refetch()).resolves.toBeUndefined();
    // The failure is still visible, on the field the UI reads.
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.isError).toBe(true);
  });

  // The hidden-inclusive view used to be a separate hook with its own key, and
  // the two recomputed the same thing from the same team list. Now that they
  // share this hook, includeHidden is the only thing keeping the public and
  // admin results apart in the cache — dropping it from the key would serve one
  // view's rankings to the other.
  it('keys the hidden-inclusive rankings apart from the public ones', () => {
    mockUseTeamsQuery.mockReturnValue({
      data: [{ id: 't1' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderHook(() => useCareerRankings({ includeHidden: true }));

    expect(mockUseQuery.mock.calls[0][0].queryKey).toEqual(['careerRankings', ['t1'], true]);
  });

  it('exposes only the fields its consumers use', () => {
    mockUseTeamsQuery.mockReturnValue({
      data: [{ id: 't1' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useCareerRankings());

    // A narrow shape on purpose: patching fields onto a borrowed query object
    // is what let `isError` and the retry contradict `error`.
    expect(Object.keys(result.current).sort()).toEqual([
      'data',
      'error',
      'isError',
      'isLoading',
      'refetch',
    ]);
  });

  it('passes its own error through when the team list is fine', () => {
    const queryError = new Error('rankings down');
    mockUseTeamsQuery.mockReturnValue({
      data: [{ id: 't1' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: queryError,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useCareerRankings());

    expect(result.current.error).toBe(queryError);
  });

  // The query function itself: the batch totals in, one ranking row per team out.
  // Teams are listed worst first on purpose, so the order can only come from the sort.
  // Every count in the top row has its own value (12, 4, 27, 13, 6, 9, 2, 1, 5 and 3 finishes),
  // so a field read from the wrong total cannot give the right number by chance.
  // Worked out by hand for "High Team" (the row checked in full):
  //   match win % = 12 / (12 + 4) = 0.75
  //   game win %  = 27 / (27 + 13) = 0.675
  //   playoff win % = 6 / (6 + 9) = 0.4
  //   playoffFinishes = the number of finishes listed (3), not the list itself
  // "Mid Team" played no playoff match, so its playoff win % is 0 (not NaN).
  it('builds one row per team with every field mapped, best career power score first', async () => {
    const totalsFor = (fields: Partial<TeamTotals>): TeamTotals =>
      ({
        career_match_wins: 0,
        career_match_losses: 0,
        career_game_wins: 0,
        career_game_losses: 0,
        career_playoff_wins: 0,
        career_playoff_losses: 0,
        championships: 0,
        runner_ups: 0,
        playoff_finishes: [],
        career_power_score: 0,
        career_sweep_rate: 0,
        career_clutch_win_pct: 0,
        career_clutch_game3s: 0,
        career_sos: 0,
        ...fields,
      }) as TeamTotals;
    const teams = [
      { id: 'team-low', name: 'Low Team', divisionName: 'Recreational' },
      {
        id: 'team-high',
        name: 'High Team',
        logoUrl: 'high-logo.png',
        imageUrl: 'high-image.png',
        divisionName: 'Competitive',
      },
      { id: 'team-mid', name: 'Mid Team', divisionName: 'Intermediate' },
    ] as unknown as Team[];
    mockUseTeamsQuery.mockReturnValue({
      data: teams,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(computeAllTeamsTotals).mockResolvedValue(
      new Map([
        ['team-low', totalsFor({ career_power_score: 41.2 })],
        [
          'team-high',
          totalsFor({
            career_match_wins: 12,
            career_match_losses: 4,
            career_game_wins: 27,
            career_game_losses: 13,
            career_playoff_wins: 6,
            career_playoff_losses: 9,
            championships: 2,
            runner_ups: 1,
            playoff_finishes: [
              { rank: 1, season_name: 'Spring 2025', division_name: 'Competitive' },
              { rank: 2, season_name: 'Fall 2025', division_name: 'Competitive' },
              { rank: 3, season_name: 'Spring 2026', division_name: 'Competitive' },
            ],
            career_power_score: 88.6,
            career_sweep_rate: 0.5,
            career_clutch_win_pct: 0.6,
            career_clutch_game3s: 5,
            career_sos: 0.55,
          }),
        ],
        ['team-mid', totalsFor({ career_power_score: 63.4, career_match_wins: 3 })],
      ])
    );

    renderHook(() => useCareerRankings());
    const rankings = await mockUseQuery.mock.calls[0][0].queryFn();

    expect(rankings.map((row: { teamId: string }) => row.teamId)).toEqual([
      'team-high',
      'team-mid',
      'team-low',
    ]);
    expect(rankings[0]).toEqual({
      teamId: 'team-high',
      teamName: 'High Team',
      logoUrl: 'high-logo.png',
      imageUrl: 'high-image.png',
      divisionName: 'Competitive',
      careerMatchWins: 12,
      careerMatchLosses: 4,
      careerWinPercentage: 0.75,
      careerGameWins: 27,
      careerGameLosses: 13,
      careerGameWinPercentage: 0.675,
      careerPlayoffWins: 6,
      careerPlayoffLosses: 9,
      careerPlayoffWinPercentage: 0.4,
      championships: 2,
      runnerUps: 1,
      careerSweepRate: 0.5,
      careerClutchWinPct: 0.6,
      careerClutchGame3s: 5,
      careerPowerScore: 88.6,
      careerSos: 0.55,
      playoffFinishes: 3,
    });
    expect(rankings[1].careerPlayoffWinPercentage).toBe(0);
  });
});
