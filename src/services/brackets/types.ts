
/**
 * Match organized by type and round for easier rendering
 */
export interface BracketMatchesByType {
  winners: any[][];
  losers: any[][];
  finals: any[];
}

/**
 * Standard match data structure used throughout the application
 */
export interface BracketMatch {
  id: string;
  round: number;
  position: number;
  matchType: string;
  team1Id: string | null;
  team2Id: string | null;
  team1Seed: number | null;
  team2Seed: number | null;
  nextWinMatchId: string | null;
  nextLoseMatchId: string | null;
  winnerId: string | null;
  bracket_id: string;
  status?: "pending" | "in_progress" | "completed";
}
