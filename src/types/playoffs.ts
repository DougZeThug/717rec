// @deprecated moved to utils/playoffs/playoffTypes
export * from '@/utils/playoffs/playoffTypes';

// Keep legacy exports for backward compatibility
export type { PlayoffBracket, PlayoffMatch, PlayoffGame, PlayoffTeam, BracketState, BracketFormat, PlayoffMatchType, DatabaseBracketState, MatchResult, BracketMatchesByType } from '@/utils/playoffs/playoffTypes';

export interface PlayoffViewModel {
  // Bracket data
  bracket: PlayoffBracket | null;
  isLoading: boolean;
  error: string | null; // Changed from Error | null to string | null for consistency
  bracketMatchesByType: BracketMatchesByType | null;
  
  // Teams data
  teams: Team[];
  teamsLoading: boolean;
  
  // Actions
  refetch: () => Promise<void>;
  deleteBracket: (bracketId: string, bracketName: string) => Promise<void>;
  updateMatchResult: (
    matchId: string,
    winnerId: string,
    team1Score: number,
    team2Score: number,
    team1GameWins?: number,
    team2GameWins?: number,
    games?: PlayoffGame[]
  ) => Promise<void>;
}
