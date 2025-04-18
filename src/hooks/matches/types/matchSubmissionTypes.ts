
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
  team1Id: string; // Add this property
  team2Id: string; // Add this property
}
