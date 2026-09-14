import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CareerRanking } from '@/types/career';

const mockUseCareerRankings = vi.fn();

vi.mock('@/hooks/useCareerRankings', () => ({
  useCareerRankings: () => mockUseCareerRankings(),
}));

import { useLeaguePercentiles } from '../useLeaguePercentiles';

const careerTeam = (overrides: Partial<CareerRanking>): CareerRanking =>
  ({
    teamId: 'team-1',
    teamName: 'Team One',
    careerMatchWins: 5,
    careerMatchLosses: 5,
    careerWinPercentage: 0.5,
    careerGameWinPercentage: 0.5,
    careerPowerScore: 50,
    careerSos: 0.5,
    championships: 0,
    careerPlayoffWins: 2,
    careerPlayoffLosses: 2,
    careerPlayoffWinPercentage: 0.5,
    ...overrides,
  }) as CareerRanking;

/** A team that has never played: scored 0 across the board, not "no score". */
const neverPlayed = (teamId: string) =>
  careerTeam({
    teamId,
    careerMatchWins: 0,
    careerMatchLosses: 0,
    careerWinPercentage: 0,
    careerGameWinPercentage: 0,
    careerPowerScore: 0,
    careerSos: 0.5,
    careerPlayoffWins: 0,
    careerPlayoffLosses: 0,
    careerPlayoffWinPercentage: 0,
  });

const percentilesFor = (data: CareerRanking[], teamId: string) => {
  mockUseCareerRankings.mockReturnValue({ data, isLoading: false });
  return renderHook(() => useLeaguePercentiles()).result.current.getTeamPercentiles(teamId);
};

describe('useLeaguePercentiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCareerRankings.mockReturnValue({ data: [], isLoading: false });
  });

  it('returns null for a team the league does not know', () => {
    expect(percentilesFor([careerTeam({ teamId: 'a' })], 'nobody')).toBeNull();
  });

  it('ranks a team against the rest of the league', () => {
    const league = [
      careerTeam({ teamId: 'top', careerPowerScore: 90 }),
      careerTeam({ teamId: 'mid', careerPowerScore: 50 }),
      careerTeam({ teamId: 'low', careerPowerScore: 10 }),
    ];

    expect(percentilesFor(league, 'top')?.powerScore.percentile).toBe(100);
    expect(percentilesFor(league, 'low')?.powerScore.percentile).toBe(0);
  });

  // The same defect the report card was fixed for, in the hook behind the team
  // page's career statistics and the Compare page. A team that has never played
  // is scored 0, so it used to enter every list at the floor and lift each real
  // team's percentile above what it earned.
  it('does not let a team that has never played lift a real percentile', () => {
    const played = [
      careerTeam({ teamId: 'top', careerPowerScore: 90, careerWinPercentage: 0.9 }),
      careerTeam({ teamId: 'mid', careerPowerScore: 50, careerWinPercentage: 0.5 }),
      careerTeam({ teamId: 'low', careerPowerScore: 10, careerWinPercentage: 0.1 }),
    ];
    const withNewcomers = [...played, neverPlayed('new-1'), neverPlayed('new-2')];

    for (const teamId of ['top', 'mid', 'low']) {
      expect(percentilesFor(withNewcomers, teamId)).toEqual(percentilesFor(played, teamId));
    }
    // Bottom of three teams that played is still the bottom, not a third of the way up.
    expect(percentilesFor(withNewcomers, 'low')?.powerScore.percentile).toBe(0);
  });

  it('reports a team that has never played as unmeasured rather than last', () => {
    const league = [careerTeam({ teamId: 'played' }), neverPlayed('newcomer')];

    const newcomer = percentilesFor(league, 'newcomer');

    expect(newcomer).not.toBeNull();
    expect(newcomer?.powerScore).toEqual({ value: 0, percentile: 0, rank: 0, total: 0 });
    expect(newcomer?.winPercentage.total).toBe(0);
  });

  it('still ranks a team whose career is nothing but losses', () => {
    const league = [
      careerTeam({
        teamId: 'winner',
        careerWinPercentage: 1,
        careerMatchWins: 6,
        careerMatchLosses: 0,
      }),
      careerTeam({
        teamId: 'loser',
        careerWinPercentage: 0,
        careerMatchWins: 0,
        careerMatchLosses: 6,
      }),
    ];

    // It played, so it is ranked — total counts both teams.
    expect(percentilesFor(league, 'loser')?.winPercentage.total).toBe(2);
  });

  // Playoffs were already counted this way; the change must not disturb it.
  it('leaves a team with no playoff match out of the playoff ranking only', () => {
    const league = [
      careerTeam({ teamId: 'deep-run', careerPlayoffWins: 5, careerPlayoffLosses: 1 }),
      careerTeam({
        teamId: 'no-playoffs',
        careerPlayoffWins: 0,
        careerPlayoffLosses: 0,
        careerPlayoffWinPercentage: 0,
      }),
    ];

    const noPlayoffs = percentilesFor(league, 'no-playoffs');

    expect(noPlayoffs?.playoffWinPercentage).toEqual({
      value: 0,
      percentile: 0,
      rank: 0,
      total: 0,
    });
    // Ranked on everything else, because it did play league matches.
    expect(noPlayoffs?.powerScore.total).toBe(2);
  });

  it('returns no percentiles at all before the career data arrives', () => {
    mockUseCareerRankings.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useLeaguePercentiles());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.getTeamPercentiles('team-1')).toBeNull();
  });
});
