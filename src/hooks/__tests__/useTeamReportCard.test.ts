import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTeamReportCard } from '@/hooks/useTeamReportCard';
import type { Match, Ranking } from '@/types';

const mockUseTeamRankings = vi.fn();
const mockUseRankingsData = vi.fn();
const mockUseCareerRankings = vi.fn();

vi.mock('@/hooks/useTeamRankings', () => ({
  useTeamRankings: () => mockUseTeamRankings(),
}));

vi.mock('@/hooks/rankings/useRankingsData', () => ({
  useRankingsData: () => mockUseRankingsData(),
}));

vi.mock('@/hooks/useCareerRankings', () => ({
  useCareerRankings: () => mockUseCareerRankings(),
}));

/** Narrows a value the test has just asserted exists, without a non-null assertion. */
const required = <T>(value: T | null | undefined): T => {
  if (value === null || value === undefined) throw new Error('expected a value, got none');
  return value;
};

// Real percentile, grade and match maths throughout: the point of these tests is
// that the numbers on the card are measurements, not that the right helper was
// called. See B-36 in docs/product-description/bug-triage.md.

const ranking = (overrides: Partial<Ranking>): Ranking =>
  ({
    teamId: 'team-1',
    teamName: 'Team One',
    wins: 5,
    losses: 5,
    winPercentage: 0.5,
    gamesWon: 10,
    gamesLost: 10,
    gameWinPercentage: 0.5,
    sos: 0.5,
    powerScore: 50,
    headToHead: {},
    closeMatchLosses: 0,
    ...overrides,
  }) as Ranking;

/** A completed match, from `winner`'s point of view, with the given game score. */
const match = (
  id: string,
  team1Id: string,
  team2Id: string,
  team1Games: number,
  team2Games: number
): Match => ({
  id,
  team1Id,
  team2Id,
  iscompleted: true,
  winnerId: team1Games > team2Games ? team1Id : team2Id,
  loserId: team1Games > team2Games ? team2Id : team1Id,
  team1_game_wins: team1Games,
  team2_game_wins: team2Games,
});

const careerTeam = (overrides: Record<string, unknown>) => ({
  teamId: 'team-1',
  teamName: 'Team One',
  careerPowerScore: 50,
  careerWinPercentage: 0.5,
  careerSos: 0.5,
  careerSweepRate: 20,
  careerGameWinPercentage: 0.5,
  careerClutchWinPct: 50,
  careerClutchGame3s: 4,
  ...overrides,
});

describe('useTeamReportCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeamRankings.mockReturnValue({ rankings: [], isLoading: false });
    mockUseRankingsData.mockReturnValue({ latestMatches: [], matchesLoading: false });
    mockUseCareerRankings.mockReturnValue({ data: [], isLoading: false });
  });

  it('returns null grades when teamId is undefined', () => {
    const { result } = renderHook(() => useTeamReportCard(undefined, 'season'));
    expect(result.current.grades).toBeNull();
  });

  it('returns null in season mode when rankings are missing', () => {
    mockUseTeamRankings.mockReturnValue({ rankings: null, isLoading: false });
    const { result } = renderHook(() => useTeamReportCard('team-1', 'season'));
    expect(result.current.grades).toBeNull();
  });

  it('returns null when the team is not in the rankings', () => {
    mockUseTeamRankings.mockReturnValue({
      rankings: [ranking({ teamId: 'other' })],
      isLoading: false,
    });
    const { result } = renderHook(() => useTeamReportCard('team-1', 'season'));
    expect(result.current.grades).toBeNull();
  });

  it('names all six categories and a GPA', () => {
    mockUseTeamRankings.mockReturnValue({
      rankings: [ranking({ teamId: 'team-1' }), ranking({ teamId: 'team-2' })],
      isLoading: false,
    });
    mockUseRankingsData.mockReturnValue({
      latestMatches: [match('m1', 'team-1', 'team-2', 2, 1)],
      matchesLoading: false,
    });

    const { result } = renderHook(() => useTeamReportCard('team-1', 'season'));
    const grades = required(result.current.grades);

    expect(Object.keys(grades).sort()).toEqual(
      ['clutch', 'consistency', 'games', 'gpa', 'offense', 'overall', 'schedule'].sort()
    );
    expect(grades.overall.label).toBe('Overall');
    expect(typeof grades.gpa).toBe('number');
  });

  describe('sweep rate is measured for every team, not estimated (B-36)', () => {
    it('ranks the team against the league’s real sweep rates', () => {
      // team-1 sweeps 1 of its 2 matches (50%). team-2 sweeps none of 2 (0%).
      // team-3 sweeps both of its 2 (100%). The old code kept team-1's real
      // figure and guessed the other two from their game win percentage.
      const matches = [
        match('m1', 'team-1', 'team-2', 2, 0), // team-1 sweep
        match('m2', 'team-1', 'team-3', 0, 2), // team-3 sweep
        match('m3', 'team-3', 'team-2', 2, 0), // team-3 sweep
        match('m4', 'team-2', 'team-1', 1, 2), // team-1 wins, not a sweep
      ];
      mockUseTeamRankings.mockReturnValue({
        rankings: [
          ranking({ teamId: 'team-1' }),
          ranking({ teamId: 'team-2' }),
          ranking({ teamId: 'team-3' }),
        ],
        isLoading: false,
      });
      mockUseRankingsData.mockReturnValue({ latestMatches: matches, matchesLoading: false });

      const middle = required(
        renderHook(() => useTeamReportCard('team-1', 'season')).result.current.grades
      );
      const best = required(
        renderHook(() => useTeamReportCard('team-3', 'season')).result.current.grades
      );
      const worst = required(
        renderHook(() => useTeamReportCard('team-2', 'season')).result.current.grades
      );

      // team-1 sweeps 33% (1 of 3 matches), team-3 100%, team-2 0%.
      expect(best.offense.percentile).toBe(100);
      expect(worst.offense.percentile).toBe(0);
      expect(middle.offense.percentile).toBeGreaterThan(required(worst.offense.percentile));
      expect(middle.offense.percentile).toBeLessThan(required(best.offense.percentile));
    });

    it('grades all three teams against one shared ranking of real sweep rates', () => {
      // The old estimate kept a team's own sweep rate real and guessed every
      // other team's, so three cards rendered separately did not line up into a
      // single ranking. The hook only ever returns the *viewed* team's grades,
      // so that is the observable form of the invariant: grade each team on its
      // own page and the three percentiles must be one coherent order.
      const matches = [
        match('m1', 'sweeper', 'middle', 2, 0), // sweeper sweeps
        match('m2', 'sweeper', 'never', 2, 0), // sweeper sweeps
        match('m3', 'middle', 'never', 2, 0), // middle sweeps one of its two
        match('m4', 'middle', 'never', 1, 2), // never wins, not a sweep
      ];
      const rankings = [
        ranking({ teamId: 'sweeper' }),
        ranking({ teamId: 'middle' }),
        ranking({ teamId: 'never' }),
      ];
      mockUseTeamRankings.mockReturnValue({ rankings, isLoading: false });
      mockUseRankingsData.mockReturnValue({ latestMatches: matches, matchesLoading: false });

      const gradeOf = (teamId: string) =>
        required(renderHook(() => useTeamReportCard(teamId, 'season')).result.current.grades)
          .offense.percentile;

      // Real sweep rates: sweeper 2 of 2 = 100%, middle 1 of 3 = 33%,
      // never 0 of 3 = 0%. Graded separately, they must still rank 100/50/0.
      expect(gradeOf('sweeper')).toBe(100);
      expect(gradeOf('middle')).toBe(50);
      expect(gradeOf('never')).toBe(0);
    });

    // Raised in review of the B-36 fix.
    it('gives no report card to a team with no rating', () => {
      // No power score means no rating at all — the standings show "—" for it.
      // It used to be graded against a power score of 0 it never earned.
      mockUseTeamRankings.mockReturnValue({
        rankings: [
          ranking({ teamId: 'unrated', powerScore: null }),
          ranking({ teamId: 'rated', powerScore: 60 }),
        ],
        isLoading: false,
      });

      const { result } = renderHook(() => useTeamReportCard('unrated', 'season'));

      expect(result.current.grades).toBeNull();
    });

    it('does not let an unrated team flatter the teams that have played', () => {
      const rated = [
        ranking({ teamId: 'strong', powerScore: 80 }),
        ranking({ teamId: 'weak', powerScore: 40 }),
      ];
      mockUseRankingsData.mockReturnValue({ latestMatches: [], matchesLoading: false });

      mockUseTeamRankings.mockReturnValue({ rankings: rated, isLoading: false });
      const withoutUnrated = required(
        renderHook(() => useTeamReportCard('weak', 'season')).result.current.grades
      ).overall.percentile;

      mockUseTeamRankings.mockReturnValue({
        rankings: [...rated, ranking({ teamId: 'unrated', powerScore: null })],
        isLoading: false,
      });
      const withUnrated = required(
        renderHook(() => useTeamReportCard('weak', 'season')).result.current.grades
      ).overall.percentile;

      // The unrated team used to sit below 'weak' as a 0, lifting its percentile.
      expect(withUnrated).toBe(withoutUnrated);
    });
  });

  // Raised in review of the B-36 fix: a failed match fetch left the hook with an
  // empty match list, so every team read as 0% sweeps and no clutch record — a
  // full card of wrong grades, presented as loaded.
  describe('a failed fetch is not empty data', () => {
    it('returns no grades and surfaces the error when the match query fails', () => {
      mockUseTeamRankings.mockReturnValue({
        rankings: [ranking({ teamId: 'team-1' }), ranking({ teamId: 'team-2' })],
        isLoading: false,
      });
      mockUseRankingsData.mockReturnValue({
        latestMatches: undefined,
        matchesLoading: false,
        matchesError: new Error('network'),
      });

      const { result } = renderHook(() => useTeamReportCard('team-1', 'season'));

      expect(result.current.grades).toBeNull();
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('returns no grades when the rankings query fails', () => {
      mockUseTeamRankings.mockReturnValue({
        rankings: [ranking({ teamId: 'team-1' })],
        isLoading: false,
        error: new Error('network'),
      });

      const { result } = renderHook(() => useTeamReportCard('team-1', 'season'));

      expect(result.current.grades).toBeNull();
      expect(result.current.error).toBeInstanceOf(Error);
    });

    // Raised in review: Retry only refetched the match list, so a rankings-only
    // failure stayed in the error state until a page reload.
    it('retry refetches the rankings, which covers the teams and the matches', () => {
      const refetchRankings = vi.fn();
      mockUseTeamRankings.mockReturnValue({
        rankings: [ranking({ teamId: 'team-1' })],
        isLoading: false,
        error: new Error('teams down'),
        refetch: refetchRankings,
      });

      const { result } = renderHook(() => useTeamReportCard('team-1', 'season'));
      result.current.retry();

      // useTeamRankings' refetch fetches the team list and the match list, so a
      // failure in either is recoverable from this one call.
      expect(refetchRankings).toHaveBeenCalled();
    });

    // Raised in review: career mode never surfaced its own fetch failure.
    it('surfaces a failed career fetch, and retries the career query', () => {
      const refetchCareer = vi.fn();
      mockUseCareerRankings.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('career down'),
        refetch: refetchCareer,
      });

      const { result } = renderHook(() => useTeamReportCard('team-1', 'career'));

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.grades).toBeNull();

      result.current.retry();
      expect(refetchCareer).toHaveBeenCalled();
    });

    it('does not report a season error in career mode', () => {
      mockUseRankingsData.mockReturnValue({
        latestMatches: undefined,
        matchesLoading: false,
        matchesError: new Error('network'),
      });
      mockUseCareerRankings.mockReturnValue({
        data: [careerTeam({ teamId: 'team-1' }), careerTeam({ teamId: 'team-2' })],
        isLoading: false,
      });

      const { result } = renderHook(() => useTeamReportCard('team-1', 'career'));

      expect(result.current.error).toBeNull();
      expect(result.current.grades).not.toBeNull();
    });
  });

  describe('clutch is a real percentile, not a raw rate (B-36)', () => {
    it('ranks the game-3 win rate against the league', () => {
      // Every one of team-1's game-3s is a win; team-2 loses all of its. A raw
      // rate would have graded team-1 at "100th" and team-2 at "0th" no matter
      // what the rest of the league did — here they are genuine ranks.
      const matches = [
        match('m1', 'team-1', 'team-2', 2, 1),
        match('m2', 'team-1', 'team-3', 2, 1),
        match('m3', 'team-2', 'team-3', 1, 2),
      ];
      mockUseTeamRankings.mockReturnValue({
        rankings: [
          ranking({ teamId: 'team-1' }),
          ranking({ teamId: 'team-2' }),
          ranking({ teamId: 'team-3' }),
        ],
        isLoading: false,
      });
      mockUseRankingsData.mockReturnValue({ latestMatches: matches, matchesLoading: false });

      const top = required(
        renderHook(() => useTeamReportCard('team-1', 'season')).result.current.grades
      );
      const bottom = required(
        renderHook(() => useTeamReportCard('team-2', 'season')).result.current.grades
      );

      expect(top.clutch.percentile).toBe(100);
      expect(bottom.clutch.percentile).toBe(0);
      expect(top.clutch.grade).toBe('A+');
    });

    it('shows Clutch as unavailable when the team has never played a game 3', () => {
      // It used to be given a neutral 50 — a C, presented like a real grade.
      const matches = [
        match('m1', 'team-1', 'team-2', 2, 0),
        match('m2', 'team-2', 'team-3', 2, 1),
      ];
      mockUseTeamRankings.mockReturnValue({
        rankings: [
          ranking({ teamId: 'team-1' }),
          ranking({ teamId: 'team-2' }),
          ranking({ teamId: 'team-3' }),
        ],
        isLoading: false,
      });
      mockUseRankingsData.mockReturnValue({ latestMatches: matches, matchesLoading: false });

      const { result } = renderHook(() => useTeamReportCard('team-1', 'season'));

      expect(required(result.current.grades).clutch.grade).toBeNull();
      expect(required(result.current.grades).clutch.percentile).toBeNull();
      // The other five are still measured.
      expect(required(result.current.grades).overall.grade).not.toBeNull();
      expect(required(result.current.grades).offense.grade).not.toBeNull();
    });

    it('leaves an unavailable grade out of the GPA rather than failing it', () => {
      const noGame3 = [match('m1', 'team-1', 'team-2', 2, 0)];
      mockUseTeamRankings.mockReturnValue({
        rankings: [
          ranking({
            teamId: 'team-1',
            powerScore: 90,
            winPercentage: 0.9,
            sos: 0.9,
            gameWinPercentage: 0.9,
          }),
          ranking({
            teamId: 'team-2',
            powerScore: 10,
            winPercentage: 0.1,
            sos: 0.1,
            gameWinPercentage: 0.1,
          }),
        ],
        isLoading: false,
      });
      mockUseRankingsData.mockReturnValue({ latestMatches: noGame3, matchesLoading: false });

      const { result } = renderHook(() => useTeamReportCard('team-1', 'season'));
      const grades = required(result.current.grades);

      expect(grades.clutch.grade).toBeNull();
      // team-1 is top of the league on every measurable category, so an
      // unavailable Clutch must not drag the GPA below 4.0.
      expect(grades.gpa).toBe(4);
    });
  });

  describe('career mode', () => {
    it('grades all six categories from career figures', () => {
      mockUseCareerRankings.mockReturnValue({
        data: [
          careerTeam({ teamId: 'team-1', careerPowerScore: 80, careerClutchWinPct: 90 }),
          careerTeam({ teamId: 'team-2', careerPowerScore: 40, careerClutchWinPct: 20 }),
        ],
        isLoading: false,
      });

      const { result } = renderHook(() => useTeamReportCard('team-1', 'career'));
      const grades = required(result.current.grades);

      expect(grades.overall.percentile).toBe(100);
      expect(grades.clutch.percentile).toBe(100);
      expect(grades.clutch.description).toBe('Career game 3 win rate');
    });

    it('shows Clutch as unavailable for a team with no career game 3', () => {
      mockUseCareerRankings.mockReturnValue({
        data: [
          careerTeam({ teamId: 'team-1', careerClutchGame3s: 0, careerClutchWinPct: 0 }),
          careerTeam({ teamId: 'team-2', careerClutchGame3s: 5, careerClutchWinPct: 60 }),
        ],
        isLoading: false,
      });

      const { result } = renderHook(() => useTeamReportCard('team-1', 'career'));

      expect(required(result.current.grades).clutch.grade).toBeNull();
    });

    it('returns null when there are no career rankings', () => {
      mockUseCareerRankings.mockReturnValue({ data: [], isLoading: false });
      const { result } = renderHook(() => useTeamReportCard('team-1', 'career'));
      expect(result.current.grades).toBeNull();
    });
  });

  describe('loading state', () => {
    it('waits for both the rankings and the league match list in season mode', () => {
      mockUseRankingsData.mockReturnValue({ latestMatches: undefined, matchesLoading: true });
      const { result } = renderHook(() => useTeamReportCard('team-1', 'season'));
      expect(result.current.isLoading).toBe(true);
    });

    it('uses the career loading state in career mode', () => {
      mockUseCareerRankings.mockReturnValue({ data: [], isLoading: true });
      const { result } = renderHook(() => useTeamReportCard('team-1', 'career'));
      expect(result.current.isLoading).toBe(true);
    });
  });
});
