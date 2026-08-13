import { describe, expect, it } from 'vitest';

import { calculateCareerMatchStats } from '../calculateCareerMatchStats';
import { MatchData, PlayoffMatchData, SeasonStats } from '../types';

describe('calculateCareerMatchStats', () => {
  const teamId = 'team-1';

  it('returns zeros when no data provided', () => {
    const result = calculateCareerMatchStats({
      seasonStats: null,
      currentMatches: null,
      teamId,
    });

    expect(result).toEqual({
      career_match_wins: 0,
      career_match_losses: 0,
      career_game_wins: 0,
      career_game_losses: 0,
    });
  });

  it('returns zeros with empty arrays', () => {
    const result = calculateCareerMatchStats({
      seasonStats: [],
      currentMatches: [],
      teamId,
    });

    expect(result).toEqual({
      career_match_wins: 0,
      career_match_losses: 0,
      career_game_wins: 0,
      career_game_losses: 0,
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
        division_name: null,
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
        division_name: null,
      },
    ];

    const result = calculateCareerMatchStats({
      seasonStats,
      currentMatches: null,
      teamId,
    });

    expect(result).toEqual({
      career_match_wins: 12, // 5 + 7
      career_match_losses: 5, // 3 + 2
      career_game_wins: 27, // 12 + 15
      career_game_losses: 14, // 8 + 6
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
        season_id: 'season-1',
      },
      {
        winner_id: 'team-1',
        loser_id: 'team-3',
        team1_id: 'team-3',
        team2_id: 'team-1',
        team1_game_wins: 0,
        team2_game_wins: 2,
        season_id: 'season-1',
      },
    ];

    const result = calculateCareerMatchStats({
      seasonStats: null,
      currentMatches,
      teamId,
    });

    expect(result).toEqual({
      career_match_wins: 2,
      career_match_losses: 0,
      career_game_wins: 4, // 2 + 2
      career_game_losses: 1, // 1 + 0
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
        season_id: 'season-1',
      },
    ];

    const result = calculateCareerMatchStats({
      seasonStats: null,
      currentMatches,
      teamId,
    });

    expect(result).toEqual({
      career_match_wins: 0,
      career_match_losses: 1,
      career_game_wins: 1,
      career_game_losses: 2,
    });
  });

  it('combines historical season stats and current matches (different seasons)', () => {
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
        division_name: null,
        season_id: 'past-season', // Different from current
      },
    ];

    const currentMatches: MatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 2,
        team2_game_wins: 0,
        season_id: 'current-season',
      },
    ];

    const result = calculateCareerMatchStats({
      seasonStats,
      currentMatches,
      teamId,
      currentSeasonId: 'current-season',
    });

    expect(result).toEqual({
      career_match_wins: 11, // 10 + 1
      career_match_losses: 5,
      career_game_wins: 27, // 25 + 2
      career_game_losses: 15, // 15 + 0
    });
  });

  it('excludes current season from seasonStats to avoid double-counting', () => {
    // This tests the fix for the Sack to the Futures bug
    const seasonStats: SeasonStats[] = [
      {
        match_wins: 0,
        match_losses: 2,
        game_wins: 1,
        game_losses: 4,
        champion: null,
        runner_up: null,
        playoff_rank: null,
        sos: null,
        division_name: null,
        season_id: 'winter-2026', // Same as current season
      },
    ];

    const currentMatches: MatchData[] = [
      {
        winner_id: 'team-2',
        loser_id: 'team-1',
        team1_id: 'team-1',
        team2_id: 'team-2',
        team1_game_wins: 0,
        team2_game_wins: 2,
        season_id: 'winter-2026',
      },
      {
        winner_id: 'team-3',
        loser_id: 'team-1',
        team1_id: 'team-1',
        team2_id: 'team-3',
        team1_game_wins: 1,
        team2_game_wins: 2,
        season_id: 'winter-2026',
      },
    ];

    const result = calculateCareerMatchStats({
      seasonStats,
      currentMatches,
      teamId,
      currentSeasonId: 'winter-2026',
    });

    // Should NOT double count: seasonStats is excluded because it's the current season
    // Only currentMatches are counted: 0 wins, 2 losses, 1 game win, 4 game losses
    expect(result).toEqual({
      career_match_wins: 0,
      career_match_losses: 2,
      career_game_wins: 1, // 0 + 1
      career_game_losses: 4, // 2 + 2
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
        season_id: 'season-1',
      },
    ];

    const result = calculateCareerMatchStats({
      seasonStats: null,
      currentMatches,
      teamId,
    });

    expect(result).toEqual({
      career_match_wins: 1,
      career_match_losses: 0,
      career_game_wins: 0,
      career_game_losses: 0,
    });
  });

  it('keeps the stored record for the archiving season when no season is active', () => {
    // Guard rail for the window between partial_archive_season and
    // finalize_playoffs. The season's regular games have already moved to
    // matches_archive (which this function never reads), so team_season_stats is
    // the only record of them. A null currentSeasonId must exclude NOTHING.
    //
    // This test fails loudly if anyone resolves the season the way
    // current_standings_season_id() does (is_active falling back to
    // playoffs_active) — that would drop the whole regular season.
    const seasonStats: SeasonStats[] = [
      {
        match_wins: 11,
        match_losses: 4,
        game_wins: 25,
        game_losses: 14,
        champion: false,
        runner_up: false,
        playoff_rank: null,
        sos: null,
        division_name: 'Competitive',
        season_id: 'archiving-season',
      },
    ];

    const playoffMatches: PlayoffMatchData[] = [
      {
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_score: 2,
        team2_score: 1,
        team1_id: 'team-1',
        team2_id: 'team-2',
        bracket_id: 'bracket-1',
      },
    ];

    const result = calculateCareerMatchStats({
      seasonStats,
      currentMatches: [],
      teamId,
      currentSeasonId: null,
      playoffMatches,
      bracketSeasonMap: { 'bracket-1': 'archiving-season' },
    });

    // The stored row is already playoff-inclusive. Counted exactly once.
    expect(result).toEqual({
      career_match_wins: 11,
      career_match_losses: 4,
      career_game_wins: 25,
      career_game_losses: 14,
    });
  });
});
