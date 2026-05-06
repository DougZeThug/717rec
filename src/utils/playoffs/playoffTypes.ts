// Core domain types ---------------------------------------------
export interface PlayoffBracket {
  id: string;
  name?: string;
  division?: string;
  divisionId?: string;
  format: string;
  matches?: PlayoffMatch[];
  champion?: string;
  state: BracketState;
  created_at?: string;
  challonge_tournament_id?: number;
  uses_brackets_manager?: boolean;
  participants?: Array<{
    position: number;
    team_id: string;
    name: string;
    logo_url?: string;
    image_url?: string;
  }>;
}

export interface PlayoffMatch {
  id: string;
  round: number;
  position: number;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  loserId?: string | null;
  team1Score?: number | null;
  team2Score?: number | null;
  team1GameWins?: number | null;
  team2GameWins?: number | null;
  matchType: PlayoffMatchType;
  bestOf: number;
  games?: PlayoffGame[];
  team1Seed?: number | null;
  team2Seed?: number | null;
  nextWinMatchId?: string | null;
  nextLoseMatchId?: string | null;
  bracket_id: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface PlayoffGame {
  id: string;
  matchId?: string;
  gameNumber?: number;
  team1Score: number;
  team2Score: number;
  winnerId?: string;
  winner?: string;
}

export interface PlayoffTeam {
  id: string;
  name: string;
  logo_url?: string;
  image_url?: string;
  division_id?: string;
  created_at?: string;
  wins?: number;
  losses?: number;
  game_wins?: number;
  game_losses?: number;
  seed?: number;
  players?: string[];
}

export type PlayoffMatchType = 'winners' | 'losers' | 'finals' | 'play-in' | 'play-in-2';
export type BracketState = 'pending' | 'in_progress' | 'completed';
export type BracketFormat = 'Single Elimination' | 'Double Elimination';

export interface DatabaseBracketState {
  isWinnersBracketComplete: boolean;
  isLosersBracketComplete: boolean;
  isResetMatchNeeded: boolean;
  isComplete: boolean;
  winnersBracketChampionId: string | null;
  losersBracketChampionId: string | null;
  championId: string | null;
}

export interface MatchResult {
  matchId: string;
  winnerId: string;
  loserId: string;
  team1Score: number;
  team2Score: number;
  team1GameWins?: number;
  team2GameWins?: number;
  games?: PlayoffGame[];
}

/**
 * Match display data used in bracket visualization
 */
export interface BracketMatchDisplay {
  id: string;
  round: number;
  position: number;
  team1Id: string | null;
  team2Id: string | null;
  team1Score: number | null;
  team2Score: number | null;
  team1GameWins: number | null;
  team2GameWins: number | null;
  winnerId: string | null;
  loserId: string | null;
  matchType: PlayoffMatchType;
  status: 'pending' | 'in_progress' | 'completed';
  bestOf: number;
  team1Seed?: number | null;
  team2Seed?: number | null;
  nextWinMatchId?: string | null;
  nextLoseMatchId?: string | null;
}

export type BracketMatchesByType = {
  winners: BracketMatchDisplay[][];
  losers: BracketMatchDisplay[][];
  finals: BracketMatchDisplay[];
  playIn?: BracketMatchDisplay[][];
};

// Legacy type aliases for backward compatibility
export type Team = PlayoffTeam;

// Updated PlayoffViewModel with string error type for consistency
export interface PlayoffViewModel {
  // Bracket data
  bracket: PlayoffBracket | null;
  isLoading: boolean;
  error: string | null; // Updated to use string for UI consistency
  bracketMatchesByType: BracketMatchesByType | null;

  // Teams data
  teams: PlayoffTeam[];
  teamsLoading: boolean;

  // Actions
  refetch: () => Promise<void>;
  deleteBracket: (bracketId: string, bracketName: string) => Promise<void>;
  updateMatchResult: (
    matchId: string,
    winnerId: string,
    loserId: string,
    team1Score: number,
    team2Score: number,
    team1GameWins?: number,
    team2GameWins?: number,
    games?: PlayoffGame[]
  ) => Promise<void>;
}
