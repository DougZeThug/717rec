
// Core domain types ---------------------------------------------
export interface PlayoffBracket {
  id: string;
  name?: string;
  division?: string;
  divisionId?: string;
  format: BracketFormat;
  matches?: PlayoffMatch[];
  champion?: string;
  state: BracketState;
  created_at?: string;
  challonge_tournament_id?: number;
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
  status?: "pending" | "in_progress" | "completed";
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

export type PlayoffMatchType = "winners" | "losers" | "finals" | "play-in" | "play-in-2";
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

export type BracketMatchesByType = {
  winners: any[][];
  losers: any[][];
  finals: any[];
  playIn?: any[][];
};

// Legacy type aliases for backward compatibility
export type Team = PlayoffTeam;

// Minimal placeholder for PlayoffViewModel until view-model is fully refactored
export interface PlayoffViewModel {
  bracket: PlayoffBracket | null;
  teams: PlayoffTeam[];
  isLoading: boolean;
  error: Error | null;
  bracketMatchesByType: BracketMatchesByType | null;
  teamsLoading: boolean;
  refetch: () => Promise<any>;
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

// Re-export Challonge API types so callers import everything here
export type { ChallongeTournament, ChallongeParticipant, ChallongeMatch } from '@/services/challonge/types';
