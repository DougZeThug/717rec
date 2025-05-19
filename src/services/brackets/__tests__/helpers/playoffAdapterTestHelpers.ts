
import { PlayoffDatabaseFacade } from '../../database/PlayoffDatabaseFacade';
import { PlayoffDatabaseAdapter } from '../../database/PlayoffDatabaseAdapter';
import { vi } from 'vitest';
import { PlayoffMatchType, PlayoffGame, PlayoffMatch } from '../../types';
import { DatabasePlayoffMatch, MatchResultDTO } from '../../database/types';

/**
 * Sets up common mocks for testing the PlayoffDatabaseAdapter
 * @returns The mocked facade instance used by the adapter
 */
export const setupAdapterTest = () => {
  // Clear mocks before each test
  vi.clearAllMocks();
  
  // Access the facade instance directly from the adapter via private property
  return (PlayoffDatabaseAdapter as any).facade as ReturnType<typeof vi.mocked<PlayoffDatabaseFacade>>;
};

/**
 * Creates a sample application match object for testing
 */
export const createAppMatch = (overrides = {}): PlayoffMatch => ({
  id: '1',
  round: 1,
  position: 1,
  matchType: 'winners' as PlayoffMatchType,
  bracket_id: 'bracket1',
  team1Id: 'team1',
  team2Id: 'team2',
  team1Seed: 1,
  team2Seed: 2,
  status: 'pending' as "pending" | "in_progress" | "completed",
  team1Score: null,
  team2Score: null,
  team1GameWins: null,
  team2GameWins: null,
  bestOf: 3,
  winnerId: null,
  loserId: null,
  nextWinMatchId: null,
  nextLoseMatchId: null,
  ...overrides
});

/**
 * Creates a sample database match object for testing
 */
export const createDbMatch = (overrides = {}): DatabasePlayoffMatch => ({
  id: '1',
  round: 1,
  position: 1,
  match_type: 'winners' as PlayoffMatchType,
  bracket_id: 'bracket1',
  team1_id: 'team1',
  team2_id: 'team2',
  team1_score: null,
  team2_score: null,
  team1_game_wins: null,
  team2_game_wins: null,
  team1_seed: 1,
  team2_seed: 2,
  winner_id: null,
  loser_id: null,
  next_win_match_id: null,
  next_lose_match_id: null,
  best_of: 3,
  status: 'pending',
  ...overrides
});

/**
 * Creates a sample match result object for testing
 */
export const createMatchResult = (overrides = {}): MatchResultDTO => ({
  winnerId: 'team1',
  loserId: 'team2',
  team1Score: 2,
  team2Score: 1,
  team1GameWins: 2,
  team2GameWins: 1,
  games: [createGame()],
  ...overrides
});

/**
 * Creates a sample game object for testing
 */
export const createGame = (overrides = {}): PlayoffGame => ({
  id: '1', 
  matchId: 'match1', 
  gameNumber: 1,
  team1Score: 21,
  team2Score: 18,
  winnerId: 'team1',
  ...overrides
});

/**
 * Creates a sample bracket state object for testing
 */
export const createBracketState = (overrides = {}) => ({
  isWinnersBracketComplete: false,
  isLosersBracketComplete: false,
  isResetMatchNeeded: false,
  isComplete: false,
  winnersBracketChampionId: null,
  losersBracketChampionId: null,
  championId: null,
  ...overrides
});
