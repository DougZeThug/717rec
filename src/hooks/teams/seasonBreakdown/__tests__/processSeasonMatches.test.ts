import { describe, expect, it } from 'vitest';

import { processSeasonMatches } from '@/services/teamSeasonStats/calculations';

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
    bracketInfo: {
      season_id: string;
      division_weight: number;
    } | null;
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

    const result = processSeasonMatches(
      TEAM_ID,
      SEASON_ID,
      regularSeasonMatches,
      [],
      teamDivisionMap
    );

    expect(result).toEqual({
      sweeps: 2,
      closeWins: 2,
      closeLosses: 2,
      divisionRecords: {
        // The 1-2 loss to the Hidden team is left out of the split. It still counts
        // as a close loss above, because sweeps and close matches do not use the tier.
        competitive: { wins: 1, losses: 0, gameWins: 2, gameLosses: 0 },
        intermediate: { wins: 1, losses: 0, gameWins: 2, gameLosses: 1 },
        recreational: { wins: 0, losses: 1, gameWins: 1, gameLosses: 2 },
      },
      playoffWins: 0,
      playoffLosses: 0,
    });
  });

  it('leaves a tied or unfinished match out of the division records', () => {
    const teamDivisionMap = new Map([[`opp-competitive_${SEASON_ID}`, 'Competitive']]);
    const tie = createRegularMatch({
      team1_id: TEAM_ID,
      team2_id: 'opp-competitive',
      team1_game_wins: 1,
      team2_game_wins: 1,
    });
    const unfinished = createRegularMatch({
      team1_id: 'opp-competitive',
      team2_id: TEAM_ID,
      team1_game_wins: 1,
      team2_game_wins: 0,
    });

    const result = processSeasonMatches(TEAM_ID, SEASON_ID, [tie, unfinished], [], teamDivisionMap);

    expect(result.divisionRecords.competitive).toEqual({
      wins: 0,
      losses: 0,
      gameWins: 0,
      gameLosses: 0,
    });
    expect(result.sweeps).toBe(0);
    expect(result.closeWins).toBe(0);
    expect(result.closeLosses).toBe(0);
  });

  // The opponent's division comes from team_season_stats, one row per team per season.
  // A team that went Hidden later must not change its old games.
  it('reads the opponent division for the season being processed', () => {
    const SEASON_A = 'season-a';
    const SEASON_B = 'season-b';
    const MOVER = 'opp-moved';
    const teamDivisionMap = new Map([
      [`${MOVER}_${SEASON_A}`, 'Competitive'],
      [`${MOVER}_${SEASON_B}`, 'Hidden'],
    ]);
    const sweepAgainstMover = (seasonId: string) =>
      createRegularMatch({
        team1_id: TEAM_ID,
        team2_id: MOVER,
        team1_game_wins: 2,
        team2_game_wins: 0,
        winner_id: TEAM_ID,
        loser_id: MOVER,
        season_id: seasonId,
      });

    const seasonA = processSeasonMatches(
      TEAM_ID,
      SEASON_A,
      [sweepAgainstMover(SEASON_A)],
      [],
      teamDivisionMap
    );
    const seasonB = processSeasonMatches(
      TEAM_ID,
      SEASON_B,
      [sweepAgainstMover(SEASON_B)],
      [],
      teamDivisionMap
    );

    // Season A: the opponent was Competitive, so the game counts there.
    expect(seasonA.divisionRecords).toEqual({
      competitive: { wins: 1, losses: 0, gameWins: 2, gameLosses: 0 },
      intermediate: { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 },
      recreational: { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 },
    });
    // Season B: the opponent was Hidden, so the game is left out of every card.
    expect(seasonB.divisionRecords).toEqual({
      competitive: { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 },
      intermediate: { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 },
      recreational: { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 },
    });
    // The sweep still counts in both seasons.
    expect(seasonA.sweeps).toBe(1);
    expect(seasonB.sweeps).toBe(1);
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
        team2_id: 'opp-playoff-zero-weight',
        team1_score: 0,
        team2_score: 2,
        winner_id: 'opp-playoff-zero-weight',
        loser_id: TEAM_ID,
        bracketInfo: { season_id: SEASON_ID, division_weight: 0 },
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
        recreational: { wins: 0, losses: 2, gameWins: 1, gameLosses: 4 },
      },
      playoffWins: 3,
      playoffLosses: 3,
    });
  });
});
