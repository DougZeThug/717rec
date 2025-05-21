
import { PlayoffDatabaseFacade } from "../../database/PlayoffDatabaseFacade";
import { PlayoffGame, PlayoffMatch } from "../../types";
import { DatabasePlayoffMatch, MatchResultDTO } from "../../database/types/DatabaseTypes";
import { vi } from "vitest";

/**
 * Setup adapter test by mocking the PlayoffDatabaseFacade
 */
export function setupAdapterTest() {
  const facade = vi.mocked(PlayoffDatabaseFacade).mock.instances[0];
  return facade;
}

/**
 * Create an application match object for testing
 */
export function createAppMatch(overrides?: Partial<PlayoffMatch>): PlayoffMatch {
  return {
    id: '1',
    bracket_id: 'bracket1',
    round: 1,
    position: 1,
    matchType: 'winners',
    team1Id: 'team1',
    team2Id: 'team2',
    team1Seed: 1,
    team2Seed: 2,
    nextWinMatchId: 'next-win',
    nextLoseMatchId: 'next-lose',
    bestOf: 3,
    status: 'pending',
    ...overrides
  };
}

/**
 * Create a database match object for testing
 */
export function createDbMatch(overrides?: Partial<DatabasePlayoffMatch>): DatabasePlayoffMatch {
  return {
    id: '1',
    bracket_id: 'bracket1',
    round: 1,
    position: 1,
    match_type: 'winners',
    team1_id: 'team1',
    team2_id: 'team2',
    team1_score: null,
    team2_score: null,
    team1_seed: 1,
    team2_seed: 2,
    winner_id: null,
    loser_id: null,
    next_win_match_id: 'next-win',
    next_lose_match_id: 'next-lose',
    best_of: 3,
    status: 'pending',
    team1_game_wins: null,
    team2_game_wins: null,
    ...overrides
  };
}

/**
 * Create a game object for testing
 */
export function createGame(overrides?: Partial<PlayoffGame>): PlayoffGame {
  return {
    id: 'game1',
    matchId: 'match1',
    gameNumber: 1,
    team1Score: 21,
    team2Score: 19,
    winnerId: 'team1',
    ...overrides
  };
}

/**
 * Create a match result object for testing
 */
export function createMatchResult(overrides?: Partial<MatchResultDTO>): MatchResultDTO {
  return {
    winnerId: 'team1',
    loserId: 'team2',
    team1Score: 2,
    team2Score: 1,
    team1GameWins: 2,
    team2GameWins: 1,
    games: [
      createGame({ winnerId: 'team1' }),
      createGame({ winnerId: 'team1' }),
      createGame({ winnerId: 'team2' })
    ],
    ...overrides
  };
}
