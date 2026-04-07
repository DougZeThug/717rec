import { describe, expect, it } from 'vitest';

import { calculateCareerClutchRate } from '../calculateClutchRate';
import type { MatchData, PlayoffMatchData } from '../types';

describe('calculateCareerClutchRate', () => {
  const teamId = 'team-1';

  it('returns zeros when no matches are provided', () => {
    expect(calculateCareerClutchRate({ regularMatches: [], playoffMatches: null, teamId })).toEqual({
      career_clutch_wins: 0,
      career_clutch_game3s: 0,
      career_clutch_win_pct: 0,
    });
  });

  it('returns zeros when no game-3 matches exist (all 2-0)', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: teamId,
        loser_id: 'team-2',
        team1_id: teamId,
        team2_id: 'team-2',
        team1_game_wins: 2,
        team2_game_wins: 0,
        season_id: 's1',
      },
    ];
    expect(calculateCareerClutchRate({ regularMatches, playoffMatches: null, teamId })).toEqual({
      career_clutch_wins: 0,
      career_clutch_game3s: 0,
      career_clutch_win_pct: 0,
    });
  });

  it('counts a regular match game-3 win', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: teamId,
        loser_id: 'team-2',
        team1_id: teamId,
        team2_id: 'team-2',
        team1_game_wins: 2,
        team2_game_wins: 1,
        season_id: 's1',
      },
    ];
    expect(calculateCareerClutchRate({ regularMatches, playoffMatches: null, teamId })).toEqual({
      career_clutch_wins: 1,
      career_clutch_game3s: 1,
      career_clutch_win_pct: 100,
    });
  });

  it('counts a regular match game-3 loss', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: 'team-2',
        loser_id: teamId,
        team1_id: teamId,
        team2_id: 'team-2',
        team1_game_wins: 1,
        team2_game_wins: 2,
        season_id: 's1',
      },
    ];
    expect(calculateCareerClutchRate({ regularMatches, playoffMatches: null, teamId })).toEqual({
      career_clutch_wins: 0,
      career_clutch_game3s: 1,
      career_clutch_win_pct: 0,
    });
  });

  it('counts playoff game-3 matches using team1_score/team2_score', () => {
    const playoffMatches: PlayoffMatchData[] = [
      {
        winner_id: teamId,
        loser_id: 'team-2',
        team1_id: teamId,
        team2_id: 'team-2',
        team1_score: 2,
        team2_score: 1,
        bracket_id: 'b1',
      },
    ];
    expect(calculateCareerClutchRate({ regularMatches: [], playoffMatches, teamId })).toEqual({
      career_clutch_wins: 1,
      career_clutch_game3s: 1,
      career_clutch_win_pct: 100,
    });
  });

  it('skips matches where teamId is not involved', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: 'team-2',
        loser_id: 'team-3',
        team1_id: 'team-2',
        team2_id: 'team-3',
        team1_game_wins: 2,
        team2_game_wins: 1,
        season_id: 's1',
      },
    ];
    expect(calculateCareerClutchRate({ regularMatches, playoffMatches: null, teamId })).toEqual({
      career_clutch_wins: 0,
      career_clutch_game3s: 0,
      career_clutch_win_pct: 0,
    });
  });

  it('skips regular matches with null game wins', () => {
    const regularMatches: MatchData[] = [
      {
        winner_id: teamId,
        loser_id: 'team-2',
        team1_id: teamId,
        team2_id: 'team-2',
        team1_game_wins: null,
        team2_game_wins: null,
        season_id: 's1',
      },
    ];
    expect(calculateCareerClutchRate({ regularMatches, playoffMatches: null, teamId })).toEqual({
      career_clutch_wins: 0,
      career_clutch_game3s: 0,
      career_clutch_win_pct: 0,
    });
  });

  it('calculates correct percentage across mixed results', () => {
    const regularMatches: MatchData[] = [
      // game-3 win (team as team2)
      {
        winner_id: teamId,
        loser_id: 'team-2',
        team1_id: 'team-2',
        team2_id: teamId,
        team1_game_wins: 1,
        team2_game_wins: 2,
        season_id: 's1',
      },
      // game-3 loss
      {
        winner_id: 'team-3',
        loser_id: teamId,
        team1_id: teamId,
        team2_id: 'team-3',
        team1_game_wins: 1,
        team2_game_wins: 2,
        season_id: 's1',
      },
      // not a game-3 (2-0)
      {
        winner_id: teamId,
        loser_id: 'team-4',
        team1_id: teamId,
        team2_id: 'team-4',
        team1_game_wins: 2,
        team2_game_wins: 0,
        season_id: 's1',
      },
    ];
    const result = calculateCareerClutchRate({ regularMatches, playoffMatches: null, teamId });
    expect(result.career_clutch_wins).toBe(1);
    expect(result.career_clutch_game3s).toBe(2);
    expect(result.career_clutch_win_pct).toBe(50);
  });
});
