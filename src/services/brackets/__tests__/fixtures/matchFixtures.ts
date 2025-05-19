
import { PlayoffMatchType } from '../../types';
import { DatabasePlayoffMatch } from '../../database/types';

/**
 * Creates a sample application match object for testing
 */
export const createAppMatch = (overrides = {}) => ({
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
  team1_seed: 1,
  team2_seed: 2,
  status: 'pending',
  team1_score: null,
  team2_score: null,
  best_of: 3,
  winner_id: null,
  loser_id: null,
  next_win_match_id: null,
  next_lose_match_id: null,
  team1_game_wins: null,
  team2_game_wins: null,
  ...overrides
});

/**
 * Creates a sample match result object for testing
 */
export const createMatchResult = (overrides = {}) => ({
  matchId: 'match1',
  winnerId: 'team1',
  loserId: 'team2',
  team1Score: 2,
  team2Score: 1,
  team1GameWins: 2,
  team2GameWins: 1,
  games: [{ 
    id: '1', 
    matchId: 'match1', 
    gameNumber: 1,
    team1Score: 21,
    team2Score: 18,
    winnerId: 'team1'
  }],
  ...overrides
});

/**
 * Creates a sample game object for testing
 */
export const createGame = (overrides = {}) => ({
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
