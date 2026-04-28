import { describe, expect, it } from 'vitest';

import { processSeasonMatches } from '../processSeasonMatches';

const TEAM_ID = 'team-main';
const SEASON_ID = 'season-2026';

const createRegularMatch = (
  overrides: Partial<{
    winner_id: string | null;
    loser_id: string | null;
    team1_game_wins: number | null;
    team2_game_wins: number | null;
    team1_id: string | null;
    team2_id: string | null;
    season_id: string | null;
  }> = {}
) => ({
  winner_id: null,
  loser_id: null,
  team1_game_wins: 0,
  team2_game_wins: 0,
  team1_id: 'team-a',
  team2_id: 'team-b',
  season_id: SEASON_ID,
  ...overrides,
});

const createPlayoffMatch = (
  overrides: Partial<{
    winner_id: string | null;
    loser_id: string | null;
    team1_score: number | null;
    team2_score: number | null;
    team1_id: string | null;
    team2_id: string | null;
    bracket_id: string | null;
    bracketInfo:
      | {
          season_id: string;
          division_weight: number;
        }
      | null;
  }> = {}
) => ({
  winner_id: null,
  loser_id: null,
  team1_score: 0,
  team2_score: 0,
  team1_id: 'team-a',
  team2_id: 'team-b',
  bracket_id: 'bracket-1',
  bracketInfo: {
    season_id: SEASON_ID,
    division_weight: 0.5,
  },
  ...overrides,
});

describe('processSeasonMatches', () => {
  it('processes regular-season sweeps/close matches and guards division record edge cases', () => {
    const regularSeasonMatches = [
      createRegularMatch({
        team1_id: TEAM_ID,
        team2_id: 'opp-competitive-win',
        team1_game_wins: 2,
        team2_game_wins: 0,
        winner_id: TEAM_ID,
        loser_id: 'opp-competitive-win',
      }),
      createRegularMatch({
        team1_id: 'opp-intermediate-win',
        team2_id: TEAM_ID,
        team1_game_wins: 1,
        team2_game_wins: 2,
        winner_id: TEAM_ID,
        loser_id: 'opp-intermediate-win',
      }),
      createRegularMatch({
        team1_id: TEAM_ID,
        team2_id: 'opp-recreational-loss',
        team1_game_wins: 1,
        team2_game_wins: 2,
        winner_id: 'opp-recreational-loss',
        loser_id: TEAM_ID,
      }),
      createRegularMatch({
        team1_id: TEAM_ID,
        team2_id: null,
        team1_game_wins: 2,
        team2_game_wins: 0,
        winner_id: TEAM_ID,
        loser_id: null,
      }),
      createRegularMatch({
        team1_id: TEAM_ID,
        team2_id: 'opp-unknown-tier',
        team1_game_wins: 2,
        team2_game_wins: 1,
        winner_id: TEAM_ID,
        loser_id: 'opp-unknown-tier',
      }),
      createRegularMatch({
        team1_id: 'opp-competitive-loss',
        team2_id: TEAM_ID,
        team1_game_wins: 2,
        team2_game_wins: 1,
        winner_id: 'opp-competitive-loss',
        loser_id: TEAM_ID,
      }),
    ];

    const teamDivisionMap = new Map([
      [`opp-competitive-win_${SEASON_ID}`, 'Competitive Division'],
      [`opp-intermediate-win_${SEASON_ID}`, 'Intermediate Ladder'],
      [`opp-recreational-loss_${SEASON_ID}`, 'Recreational Division'],
      [`opp-competitive-loss_${SEASON_ID}`, 'hidden bracket'],
      [`opp-unknown-tier_${SEASON_ID}`, 'Elite Premier'],
    ]);

    const result = processSeasonMatches(TEAM_ID, SEASON_ID, regularSeasonMatches, [], teamDivisionMap);

    expect(result).toEqual({
      sweeps: 2,
      closeWins: 2,
      closeLosses: 2,
      divisionRecords: {
        competitive: { wins: 1, losses: 1, gameWins: 3, gameLosses: 2 },
        intermediate: { wins: 1, losses: 0, gameWins: 2, gameLosses: 1 },
        recreational: { wins: 0, losses: 1, gameWins: 1, gameLosses: 2 },
      },
      playoffWins: 0,
      playoffLosses: 0,
    });
  });

  it('processes playoff counters and maps division tiers from bracketInfo.division_weight', () => {
    const playoffMatches = [
      createPlayoffMatch({
        team1_id: TEAM_ID,
        team2_id: 'opp-playoff-1',
        team1_score: 2,
        team2_score: 0,
        winner_id: TEAM_ID,
        loser_id: 'opp-playoff-1',
        bracketInfo: { season_id: SEASON_ID, division_weight: 0.89 },
      }),
      createPlayoffMatch({
        team1_id: 'opp-playoff-2',
        team2_id: TEAM_ID,
        team1_score: 1,
        team2_score: 2,
        winner_id: TEAM_ID,
        loser_id: 'opp-playoff-2',
        bracketInfo: { season_id: SEASON_ID, division_weight: 0.4 },
      }),
      createPlayoffMatch({
        team1_id: TEAM_ID,
        team2_id: 'opp-playoff-3',
        team1_score: 1,
        team2_score: 2,
        winner_id: 'opp-playoff-3',
        loser_id: TEAM_ID,
        bracketInfo: { season_id: SEASON_ID, division_weight: 0.39 },
      }),
      createPlayoffMatch({
        team1_id: 'opp-playoff-4',
        team2_id: TEAM_ID,
        team1_score: 2,
        team2_score: 1,
        winner_id: 'opp-playoff-4',
        loser_id: TEAM_ID,
        bracketInfo: null,
      }),
      createPlayoffMatch({
        team1_id: TEAM_ID,
        team2_id: 'opp-playoff-5',
        team1_score: 2,
        team2_score: 1,
        winner_id: TEAM_ID,
        loser_id: 'opp-playoff-5',
        bracketInfo: {
          season_id: SEASON_ID,
          division_weight: undefined as unknown as number,
        },
      }),
    ];

    const result = processSeasonMatches(TEAM_ID, SEASON_ID, [], playoffMatches, new Map());

    expect(result).toEqual({
      sweeps: 1,
      closeWins: 2,
      closeLosses: 2,
      divisionRecords: {
        competitive: { wins: 1, losses: 0, gameWins: 2, gameLosses: 0 },
        intermediate: { wins: 2, losses: 1, gameWins: 5, gameLosses: 4 },
        recreational: { wins: 0, losses: 1, gameWins: 1, gameLosses: 2 },
      },
      playoffWins: 3,
      playoffLosses: 2,
    });
  });
});
