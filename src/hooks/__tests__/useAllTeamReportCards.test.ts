import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAllTeamReportCards } from '@/hooks/useAllTeamReportCards';
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

describe('useAllTeamReportCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeamRankings.mockReturnValue({ rankings: [], isLoading: false });
    mockUseRankingsData.mockReturnValue({ latestMatches: [], matchesLoading: false });
    mockUseCareerRankings.mockReturnValue({ data: [], isLoading: false });
  });

  it('returns an empty leaderboard with no rankings', () => {
    const { result } = renderHook(() => useAllTeamReportCards('season'));
    expect(result.current.leaderboard).toEqual([]);
  });

  it('lists every team, best GPA first', () => {
    mockUseTeamRankings.mockReturnValue({
      rankings: [
        ranking({ teamId: 'weak', teamName: 'Weak', powerScore: 10, winPercentage: 0.1 }),
        ranking({ teamId: 'strong', teamName: 'Strong', powerScore: 90, winPercentage: 0.9 }),
      ],
      isLoading: false,
    });
    mockUseRankingsData.mockReturnValue({
      latestMatches: [match('m1', 'strong', 'weak', 2, 1)],
      matchesLoading: false,
    });

    const { result } = renderHook(() => useAllTeamReportCards('season'));

    expect(result.current.leaderboard.map((e) => e.teamId)).toEqual(['strong', 'weak']);
    expect(result.current.leaderboard[0].gpa).toBeGreaterThan(result.current.leaderboard[1].gpa);
  });

  // B-36: every team used to be given calculateGrade(50) for Clutch. It never
  // appeared as a grade, but it carried GPA weight, so it moved this ordering.
  it('separates teams by their real clutch record', () => {
    // Identical on every other measure. Only the game-3 record differs, so it is
    // the only thing that can separate them.
    const rankings = [
      ranking({ teamId: 'ice', teamName: 'Ice' }),
      ranking({ teamId: 'choke', teamName: 'Choke' }),
    ];
    mockUseTeamRankings.mockReturnValue({ rankings, isLoading: false });
    mockUseRankingsData.mockReturnValue({
      latestMatches: [match('m1', 'ice', 'choke', 2, 1), match('m2', 'ice', 'choke', 2, 1)],
      matchesLoading: false,
    });

    const { result } = renderHook(() => useAllTeamReportCards('season'));
    const [first, second] = result.current.leaderboard;

    expect(first.teamId).toBe('ice');
    expect(first.gpa).toBeGreaterThan(second.gpa);
  });

  it('separates teams by their real sweep rate', () => {
    // Both carry the same 0.5 game win percentage in the standings, and the old
    // estimate derived sweep rate from exactly that — so it could never tell
    // these two apart. Their actual sweep records are 100% and 0%.
    const rankings = [
      ranking({ teamId: 'sweeper', teamName: 'Sweeper' }),
      ranking({ teamId: 'grinder', teamName: 'Grinder' }),
    ];
    mockUseTeamRankings.mockReturnValue({ rankings, isLoading: false });
    mockUseRankingsData.mockReturnValue({
      latestMatches: [
        match('m1', 'sweeper', 'grinder', 2, 0),
        match('m2', 'sweeper', 'grinder', 2, 0),
      ],
      matchesLoading: false,
    });

    const { result } = renderHook(() => useAllTeamReportCards('season'));
    const entries = Object.fromEntries(result.current.leaderboard.map((e) => [e.teamId, e.gpa]));

    expect(entries.sweeper).toBeGreaterThan(entries.grinder);
  });

  // Raised in review of the B-36 fix.
  it('omits a team with no rating from the leaderboard', () => {
    mockUseTeamRankings.mockReturnValue({
      rankings: [
        ranking({ teamId: 'rated', powerScore: 60 }),
        ranking({ teamId: 'unrated', powerScore: null }),
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useAllTeamReportCards('season'));

    // It used to be listed with a GPA built from a power score of 0.
    expect(result.current.leaderboard.map((e) => e.teamId)).toEqual(['rated']);
  });

  it('returns nothing and surfaces the error when the match query fails', () => {
    mockUseTeamRankings.mockReturnValue({
      rankings: [ranking({ teamId: 'a' }), ranking({ teamId: 'b' })],
      isLoading: false,
    });
    mockUseRankingsData.mockReturnValue({
      latestMatches: undefined,
      matchesLoading: false,
      matchesError: new Error('network'),
    });

    const { result } = renderHook(() => useAllTeamReportCards('season'));

    // "No data available yet" would be untrue: the request failed.
    expect(result.current.leaderboard).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('waits for the league match list before grading', () => {
    mockUseRankingsData.mockReturnValue({ latestMatches: undefined, matchesLoading: true });
    const { result } = renderHook(() => useAllTeamReportCards('season'));
    expect(result.current.isLoading).toBe(true);
  });

  describe('career mode', () => {
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

    it('orders by career GPA', () => {
      mockUseCareerRankings.mockReturnValue({
        data: [
          careerTeam({ teamId: 'low', careerPowerScore: 20, careerWinPercentage: 0.2 }),
          careerTeam({ teamId: 'high', careerPowerScore: 95, careerWinPercentage: 0.95 }),
        ],
        isLoading: false,
      });

      const { result } = renderHook(() => useAllTeamReportCards('career'));
      expect(result.current.leaderboard.map((e) => e.teamId)).toEqual(['high', 'low']);
    });

    it('does not sink a strong team that has never played a career game 3', () => {
      mockUseCareerRankings.mockReturnValue({
        data: [
          careerTeam({
            teamId: 'elite',
            careerPowerScore: 95,
            careerWinPercentage: 0.95,
            careerClutchGame3s: 0,
            careerClutchWinPct: 0,
          }),
          careerTeam({
            teamId: 'weak',
            careerPowerScore: 20,
            careerWinPercentage: 0.2,
            careerClutchGame3s: 5,
            careerClutchWinPct: 100,
          }),
        ],
        isLoading: false,
      });

      const { result } = renderHook(() => useAllTeamReportCards('career'));

      // The missing clutch grade is left out of the average, not counted as an
      // F, so the better team still leads.
      expect(result.current.leaderboard[0].teamId).toBe('elite');
    });
  });
});

// The report card shows a team's GPA next to a "View All GPAs" button whose
// dialog highlights the same team's row. Those two numbers came from different
// hooks with different maths — the card used the team's real clutch record and
// its own real sweep rate, the leaderboard a neutral clutch grade and an
// estimated sweep rate — so they disagreed for the same team. See B-36.
describe('the card and the leaderboard agree', () => {
  it('gives a team the same GPA in both places', async () => {
    const { useTeamReportCard } = await import('@/hooks/useTeamReportCard');

    const rankings = [
      ranking({
        teamId: 'a',
        powerScore: 80,
        winPercentage: 0.8,
        sos: 0.7,
        gameWinPercentage: 0.7,
      }),
      ranking({
        teamId: 'b',
        powerScore: 50,
        winPercentage: 0.5,
        sos: 0.5,
        gameWinPercentage: 0.5,
      }),
      ranking({
        teamId: 'c',
        powerScore: 20,
        winPercentage: 0.2,
        sos: 0.3,
        gameWinPercentage: 0.3,
      }),
    ];
    const matches = [
      match('m1', 'a', 'b', 2, 0),
      match('m2', 'b', 'c', 2, 1),
      match('m3', 'c', 'a', 1, 2),
    ];
    mockUseTeamRankings.mockReturnValue({ rankings, isLoading: false });
    mockUseRankingsData.mockReturnValue({ latestMatches: matches, matchesLoading: false });

    const leaderboard = renderHook(() => useAllTeamReportCards('season')).result.current
      .leaderboard;

    for (const teamId of ['a', 'b', 'c']) {
      const card = required(
        renderHook(() => useTeamReportCard(teamId, 'season')).result.current.grades
      );
      const row = required(leaderboard.find((e) => e.teamId === teamId));

      expect(row.gpa).toBe(card.gpa);
      expect(row.overallGrade).toBe(card.overall.grade);
    }
  });
});
