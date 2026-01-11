export interface SubmitScoreParams {
  matchId: string;
  team1Score: number;
  team2Score: number;
  team1GameWins?: number;
  team2GameWins?: number;
}

export interface MatchResultData {
  winnerId: string | null;
  loserId: string | null;
  team1GameWins: number;
  team2GameWins: number;
  team1Id: string;
  team2Id: string;
}

// Add this interface to align with what's being used in PlayoffDatabaseAdapter
export interface MatchResult {
  matchId: string;
  winnerId: string;
  loserId: string;
  team1Score: number;
  team2Score: number;
  games: PlayoffGame[];
}

export interface PlayoffGame {
  id: string;
  matchId: string;
  gameNumber: number;
  team1Score: number;
  team2Score: number;
  winnerId: string | null;
}
