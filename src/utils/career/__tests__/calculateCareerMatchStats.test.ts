
import { describe, it, expect } from 'vitest';
import { calculateCareerMatchStats } from '../calculateCareerMatchStats';
import { SeasonStats, MatchData } from '../types';

describe('calculateCareerMatchStats', () => {
  const teamId = 'team-1';

  it('returns zeros when no data provided', () => {
    const result = calculateCareerMatchStats({
      seasonStats: null,
      currentMatches: null,
      teamId
    });

    expect(result).toEqual({
      career_match_wins: 0,
      career_match_losses: 0,
      career_game_wins: 0,
      career_game_losses: 0
    });
  });

  it('returns zeros with empty arrays', () => {
    const result = calculateCareerMatchStats({
      seasonStats: [],
      currentMatches: [],
      teamId
    });

    expect(result).toEqual({
      career_match_wins: 0,
      career_match_losses: 0,
      career_game_wins: 0,
      career_game_losses: 0
    });
  });

  it('aggregates season stats correctly', () => {
    const seasonStats: SeasonStats[] = [
      { 
        match_wins: 5, 
        match_losses: 3, 
        game_wins: 12, 
        game_losses: 8,
        champion: null,
        runner_up: null,
        playoff_rank: null,
        sos: null,
        division_name: null
      },
      { 
        match_wins: 7, 
        match_losses: 2, 
        game_wins: 15, 
        game_losses: 6,
        champion: null,
        runner_up: null,
        playoff_rank: null,
        sos: null,
        division_name: null
      }
    ];

    const result = calculateCareerMatchStats({
      seasonStats,
      currentMatches: null,
      teamId
    });

    expect(result).toEqual({
      career_match_wins: 12,    // 5 + 7
      career_match_losses: 5,   // 3 + 2
      career_game_wins: 27,     // 12 + 15
      career_game_losses: 14    // 8 + 6
    });
  });

  it('adds current season match wins correctly', () => {
    const currentMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 2,
        team2_game_wins: 1,
        season_id: 'season-1'
      },
      {
        winner_id: 'team-1',
        loser_id: 'team-3',
        team1_id: 'team-3',
        team2_id: 'team-1',
        team1_game_wins: 0,
        team2_game_wins: 2,
        season_id: 'season-1'
      }
    ];

    const result = calculateCareerMatchStats({
      seasonStats: null,
      currentMatches,
      teamId
    });

    expect(result).toEqual({
      career_match_wins: 2,
      career_match_losses: 0,
      career_game_wins: 4,     // 2 + 2
      career_game_losses: 1    // 1 + 0
    });
  });

  it('adds current season match losses correctly', () => {
    const currentMatches: MatchData[] = [
      {
        winner_id: 'team-2',
        loser_id: 'team-1',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 1,
        team2_game_wins: 2,
        season_id: 'season-1'
      }
    ];

    const result = calculateCareerMatchStats({
      seasonStats: null,
      currentMatches,
      teamId
    });

    expect(result).toEqual({
      career_match_wins: 0,
      career_match_losses: 1,
      career_game_wins: 1,
      career_game_losses: 2
    });
  });

  it('combines season stats and current matches', () => {
    const seasonStats: SeasonStats[] = [
      { 
        match_wins: 10, 
        match_losses: 5, 
        game_wins: 25, 
        game_losses: 15,
        champion: null,
        runner_up: null,
        playoff_rank: null,
        sos: null,
        division_name: null
      }
    ];

    const currentMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 2,
        team2_game_wins: 0,
        season_id: 'season-1'
      }
    ];

    const result = calculateCareerMatchStats({
      seasonStats,
      currentMatches,
      teamId
    });

    expect(result).toEqual({
      career_match_wins: 11,   // 10 + 1
      career_match_losses: 5,
      career_game_wins: 27,    // 25 + 2
      career_game_losses: 15   // 15 + 0
    });
  });

  it('handles null game wins values', () => {
    const currentMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: null,
        team2_game_wins: null,
        season_id: 'season-1'
      }
    ];

    const result = calculateCareerMatchStats({
      seasonStats: null,
      currentMatches,
      teamId
    });

    expect(result).toEqual({
      career_match_wins: 1,
      career_match_losses: 0,
      career_game_wins: 0,
      career_game_losses: 0
    });
  });
});
