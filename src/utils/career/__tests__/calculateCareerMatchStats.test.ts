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

  describe('current-season playoff matches', () => {
    const currentSeasonId = 'season-1';
    const bracketSeasonMap = { 'bracket-1': currentSeasonId };

    const playoffWin: PlayoffMatchData = {
      winner_id: teamId,
      loser_id: 'team-2',
      team1_id: teamId,
      team2_id: 'team-2',
      team1_score: 2,
      team2_score: 1,
      bracket_id: 'bracket-1',
    };

    // A bye: a winner is recorded but there is no opponent to have beaten.
    const bye: PlayoffMatchData = {
      winner_id: teamId,
      loser_id: null,
      team1_id: teamId,
      team2_id: null,
      team1_score: 0,
      team2_score: null,
      bracket_id: 'bracket-1',
    };

    it('counts a real current-season playoff win', () => {
      const result = calculateCareerMatchStats({
        seasonStats: null,
        currentMatches: null,
        teamId,
        currentSeasonId,
        playoffMatches: [playoffWin],
        bracketSeasonMap,
      });

      expect(result).toEqual({
        career_match_wins: 1,
        career_match_losses: 0,
        career_game_wins: 2,
        career_game_losses: 1,
      });
    });

    it('does not count a bye as a win', () => {
      // "Playoff games count, byes do not" (docs/OPERATIONS.md §6a). A bye row
      // carries a winner_id, so without an opponent check it reads as a free win.
      const result = calculateCareerMatchStats({
        seasonStats: null,
        currentMatches: null,
        teamId,
        currentSeasonId,
        playoffMatches: [bye],
        bracketSeasonMap,
      });

      expect(result).toEqual({
        career_match_wins: 0,
        career_match_losses: 0,
        career_game_wins: 0,
        career_game_losses: 0,
      });
    });

    it('counts the real win and skips the bye when both are present', () => {
      const result = calculateCareerMatchStats({
        seasonStats: null,
        currentMatches: null,
        teamId,
        currentSeasonId,
        playoffMatches: [bye, playoffWin],
        bracketSeasonMap,
      });

      expect(result.career_match_wins).toBe(1);
    });

    it('skips a bye recorded in the second slot', () => {
      const byeInSlot2: PlayoffMatchData = { ...bye, team1_id: null, team2_id: teamId };

      const result = calculateCareerMatchStats({
        seasonStats: null,
        currentMatches: null,
        teamId,
        currentSeasonId,
        playoffMatches: [byeInSlot2],
        bracketSeasonMap,
      });

      expect(result.career_match_wins).toBe(0);
    });
  });
});
