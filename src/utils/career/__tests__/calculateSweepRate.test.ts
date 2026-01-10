import { describe, expect, it } from 'vitest';

import { calculateSweepRate } from '../calculateSweepRate';
import { MatchData, PlayoffMatchData } from '../types';

describe('calculateSweepRate', () => {
  const teamId = 'team-1';

  it('returns zeros when no matches', () => {
    const result = calculateSweepRate({
      regularMatches: [],
      playoffMatches: null,
      teamId,
      totalMatches: 0,
    });

    expect(result).toEqual({
      career_sweeps: 0,
      career_sweep_rate: 0,
    });
  });

  it('detects 2-0 sweep as team1 in regular match', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 2,
        team2_game_wins: 0,
        season_id: 'season-1',
      },
    ];

    const result = calculateSweepRate({
      regularMatches,
      playoffMatches: null,
      teamId,
      totalMatches: 1,
    });

    expect(result.career_sweeps).toBe(1);
    expect(result.career_sweep_rate).toBe(100);
  });

  it('detects 2-0 sweep as team2 in regular match', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-2',
        team2_id: 'team-1',
        team1_game_wins: 0,
        team2_game_wins: 2,
        season_id: 'season-1',
      },
    ];

    const result = calculateSweepRate({
      regularMatches,
      playoffMatches: null,
      teamId,
      totalMatches: 1,
    });

    expect(result.career_sweeps).toBe(1);
  });

  it('does not count 2-1 win as sweep', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 2,
        team2_game_wins: 1,
        season_id: 'season-1',
      },
    ];

    const result = calculateSweepRate({
      regularMatches,
      playoffMatches: null,
      teamId,
      totalMatches: 1,
    });

    expect(result.career_sweeps).toBe(0);
  });

  it('does not count losses as sweeps', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: 'team-2',
        loser_id: 'team-1',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 0,
        team2_game_wins: 2,
        season_id: 'season-1',
      },
    ];

    const result = calculateSweepRate({
      regularMatches,
      playoffMatches: null,
      teamId,
      totalMatches: 1,
    });

    expect(result.career_sweeps).toBe(0);
  });

  it('detects sweeps in playoff matches', () => {
    const playoffMatches: PlayoffMatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_score: 2,
        team2_score: 0,
        bracket_id: 'bracket-1',
      },
    ];

    const result = calculateSweepRate({
      regularMatches: [],
      playoffMatches,
      teamId,
      totalMatches: 1,
    });

    expect(result.career_sweeps).toBe(1);
  });

  it('skips matches with missing game wins data', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: null,
        team2_game_wins: null,
        season_id: 'season-1',
      },
    ];

    const result = calculateSweepRate({
      regularMatches,
      playoffMatches: null,
      teamId,
      totalMatches: 1,
    });

    expect(result.career_sweeps).toBe(0);
  });

  it('calculates sweep rate percentage correctly', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 2,
        team2_game_wins: 0,
        season_id: 'season-1',
      },
      {
        winner_id: 'team-1',
        loser_id: 'team-3',
        team1_id: 'team-1',
        team2_id: 'team-3',
        team1_game_wins: 2,
        team2_game_wins: 1,
        season_id: 'season-1',
      },
    ];

    const result = calculateSweepRate({
      regularMatches,
      playoffMatches: null,
      teamId,
      totalMatches: 4, // Assuming 4 total matches played
    });

    expect(result.career_sweeps).toBe(1);
    expect(result.career_sweep_rate).toBe(25); // 1/4 = 25%
  });
});
