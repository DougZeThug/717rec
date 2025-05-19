
import { bracketManager } from './manager/BracketManager';
import { bracketCreationService } from './services/BracketCreationService';
import { matchResultService } from './services/MatchResultService';
import { Team } from "@/types";
import { mapBracketsToAppFormat } from './utils/BracketConversionUtils';

/** 
 * Create a double-elimination stage (play-ins auto-handled) 
 */
export async function createDoubleElimStage(
  bracketId: string,
  name: string,
  teams: Team[],
  bestOf = 3,
): Promise<void> {
  return bracketCreationService.createDoubleElimStage(bracketId, name, teams, bestOf);
}

/** 
 * Create a single-elimination stage 
 */
export async function createSingleElimStage(
  bracketId: string,
  name: string,
  teams: Team[],
  bestOf = 3,
): Promise<void> {
  return bracketCreationService.createSingleElimStage(bracketId, name, teams, bestOf);
}

/** 
 * Update a match result 
 */
export async function updateMatchResult(
  matchId: string,
  winnerId: string,
  team1Score: number,
  team2Score: number
): Promise<void> {
  return matchResultService.updateMatchResult(matchId, winnerId, team1Score, team2Score);
}

/** 
 * Create a Tournament Bracket 
 */
export async function createTournamentBracket(
  bracketFormat: 'Single Elimination' | 'Double Elimination',
  name: string,
  divisionId: string,
  teams: Team[]
): Promise<string> {
  return bracketCreationService.createTournamentBracket(bracketFormat, name, divisionId, teams);
}

// Export for re-use
export { bracketManager };
export { mapBracketsToAppFormat };
