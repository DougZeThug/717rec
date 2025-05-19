
import { bracketManager } from './manager/BracketManager';
import { BracketCreationService } from './services/BracketCreationService';
import { MatchScoreService } from './services/MatchScoreService';
import { Team } from "@/types";
import { mapBracketsToAppFormat } from './utils/BracketConversionUtils';
import { BracketFormat } from '@/constants/brackets';

/** 
 * Create a double-elimination stage (play-ins auto-handled) 
 */
export async function createDoubleElimStage(
  bracketId: string,
  name: string,
  teams: Team[],
  bestOf = 3,
): Promise<void> {
  return BracketCreationService.createDoubleElimStage(bracketId, name, teams, bestOf);
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
  return BracketCreationService.createSingleElimStage(bracketId, name, teams, bestOf);
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
  // Create empty games array since we're using a simplified approach
  const games: { team1Score: number; team2Score: number }[] = [];
  // Assuming team1 is the winner for game stats
  const team1GameWins = winnerId === matchId.split('-')[0] ? 1 : 0;
  const team2GameWins = 1 - team1GameWins;
  
  return MatchScoreService.updateMatchScore(
    matchId, 
    team1Score, 
    team2Score, 
    games, 
    team1GameWins, 
    team2GameWins
  );
}

/** 
 * Create a Tournament Bracket 
 */
export async function createTournamentBracket(
  bracketFormat: BracketFormat,
  name: string,
  divisionId: string,
  teams: Team[]
): Promise<string> {
  // Fix: Convert string format to BracketFormat when needed
  const format = bracketFormat as BracketFormat;
  return BracketCreationService.createBracket(
    format,
    name, 
    divisionId, 
    teams.map(t => t.id)
  );
}

// Export for re-use
export { bracketManager };
export { mapBracketsToAppFormat };
