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

  it('ignores a regular match where the team is neither winner nor loser', () => {
    const currentMatches: MatchData[] = [
      {
        winner_id: 'team-2',
        loser_id: 'team-3',
        team1_id: 'team-2',
        team2_id: 'team-3',
        team1_game_wins: 2,
        team2_game_wins: 1,
        season_id: 'season-1',
      },
    ];

    const result = calculateCareerMatchStats({ seasonStats: null, currentMatches, teamId });

    expect(result).toEqual({
      career_match_wins: 0,
      career_match_losses: 0,
      career_game_wins: 0,
      career_game_losses: 0,
    });
  });

  it('treats null season stat fields as 0', () => {
    const seasonStats: SeasonStats[] = [
      {
        match_wins: null,
        match_losses: 2,
        game_wins: null,
        game_losses: 3,
        champion: null,
        runner_up: null,
        playoff_rank: null,
        sos: null,
        division_name: null,
      },
    ];

    const result = calculateCareerMatchStats({ seasonStats, currentMatches: null, teamId });

    expect(result).toEqual({
      career_match_wins: 0,
      career_match_losses: 2,
      career_game_wins: 0,
      career_game_losses: 3,
    });
  });

  describe('current-season playoff matches', () => {
    const currentSeasonId = 'current-season';
    const bracketSeasonMap = { 'bracket-now': currentSeasonId, 'bracket-old': 'old-season' };
    const playoff = (overrides: Partial<PlayoffMatchData>): PlayoffMatchData => ({
      winner_id: 'team-1',
      loser_id: 'team-2',
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1_score: 2,
      team2_score: 1,
      bracket_id: 'bracket-now',
      ...overrides,
    });
    const run = (
      playoffMatches: PlayoffMatchData[] | null,
      options: { currentSeasonId?: string | null; bracketSeasonMap?: Record<string, string> } = {
        currentSeasonId,
        bracketSeasonMap,
      }
    ) =>
      calculateCareerMatchStats({
        seasonStats: null,
        currentMatches: null,
        teamId,
        playoffMatches,
        ...options,
      });

    it('counts a playoff win with the team on side 1', () => {
      expect(run([playoff({})])).toEqual({
        career_match_wins: 1,
        career_match_losses: 0,
        career_game_wins: 2,
        career_game_losses: 1,
      });
    });

    it('counts a playoff win with the team on side 2', () => {
      const match = playoff({
        team1_id: 'team-2',
        team2_id: 'team-1',
        team1_score: 1,
        team2_score: 2,
      });
      expect(run([match])).toEqual({
        career_match_wins: 1,
        career_match_losses: 0,
        career_game_wins: 2,
        career_game_losses: 1,
      });
    });

    it('counts a playoff loss with the team on side 1', () => {
      const match = playoff({
        winner_id: 'team-2',
        loser_id: 'team-1',
        team1_score: 1,
        team2_score: 2,
      });
      expect(run([match])).toEqual({
        career_match_wins: 0,
        career_match_losses: 1,
        career_game_wins: 1,
        career_game_losses: 2,
      });
    });

    it('counts a playoff loss with the team on side 2', () => {
      const match = playoff({
        winner_id: 'team-2',
        loser_id: 'team-1',
        team1_id: 'team-2',
        team2_id: 'team-1',
        team1_score: 2,
        team2_score: 1,
      });
      expect(run([match])).toEqual({
        career_match_wins: 0,
        career_match_losses: 1,
        career_game_wins: 1,
        career_game_losses: 2,
      });
    });

    it('treats null playoff scores as 0', () => {
      expect(run([playoff({ team1_score: null, team2_score: null })])).toEqual({
        career_match_wins: 1,
        career_match_losses: 0,
        career_game_wins: 0,
        career_game_losses: 0,
      });
    });

    it('ignores a playoff match where the team is neither winner nor loser', () => {
      const match = playoff({ winner_id: 'team-2', loser_id: 'team-3', team2_id: 'team-3' });
      expect(run([match])).toEqual({
        career_match_wins: 0,
        career_match_losses: 0,
        career_game_wins: 0,
        career_game_losses: 0,
      });
    });

    it.each([
      ['bracket maps to an older season', playoff({ bracket_id: 'bracket-old' })],
      ['bracket is not in the season map', playoff({ bracket_id: 'bracket-unknown' })],
      ['bracket_id is null', playoff({ bracket_id: null })],
      ['winner_id is null', playoff({ winner_id: null })],
    ])('skips a playoff match when %s', (_label, match) => {
      expect(run([match])).toEqual({
        career_match_wins: 0,
        career_match_losses: 0,
        career_game_wins: 0,
        career_game_losses: 0,
      });
    });

    it.each([
      ['currentSeasonId is missing', { bracketSeasonMap }],
      ['bracketSeasonMap is missing', { currentSeasonId }],
    ])('ignores playoff matches when %s', (_label, options) => {
      expect(run([playoff({})], options)).toEqual({
        career_match_wins: 0,
        career_match_losses: 0,
        career_game_wins: 0,
        career_game_losses: 0,
      });
    });

    it('adds playoff matches on top of current-season regular matches', () => {
      const currentMatches: MatchData[] = [
        {
          winner_id: 'team-1',
          loser_id: 'team-2',
          team1_id: 'team-1',
          team2_id: 'team-2',
          team1_game_wins: 2,
          team2_game_wins: 0,
          season_id: currentSeasonId,
        },
      ];
      const result = calculateCareerMatchStats({
        seasonStats: null,
        currentMatches,
        teamId,
        currentSeasonId,
        playoffMatches: [playoff({})],
        bracketSeasonMap,
      });

      expect(result).toEqual({
        career_match_wins: 2,
        career_match_losses: 0,
        career_game_wins: 4,
        career_game_losses: 1,
      });
    });
  });
});
