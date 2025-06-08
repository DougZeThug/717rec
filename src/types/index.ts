
// Team related types
export interface Team {
  id: string;
  name: string;
  wins?: number;
  losses?: number;
  game_wins?: number;
  game_losses?: number;
  divisionName?: string;
  division_id?: string;
  division?: string;
  imageUrl?: string;
  logoUrl?: string;
  players?: string[];
  seed?: number;
  challonge_participant_id?: number;
  power_score?: number;
  sos?: number;
  win_percentage?: number;
  game_win_percentage?: number;
  created_at?: string;
  close_match_losses?: number;
  hidden?: boolean;
}

// Match related types - Updated to match actual database schema
export interface Match {
  id: string;
  team1Id: string;
  team2Id: string;
  team1Score?: number;
  team2Score?: number;
  winnerId?: string;
  loserId?: string;
  date?: string;
  location?: string;
  iscompleted?: boolean;
  best_of?: number;
  team1_game_wins?: number;
  team2_game_wins?: number;
  created_at?: string;
  status?: "postponed" | "canceled" | null;
  timeSlot?: string | null;
  match_type?: string;
  season_id?: string;
  metadata?: any;
  team1Details?: {
    team_id: string;
    name: string;
    image_url: string | null;
    logo_url: string | null;
    divisionName: string | null;
  } | null;
  team2Details?: {
    team_id: string;
    name: string;
    image_url: string | null;
    logo_url: string | null;
    divisionName: string | null;
  } | null;
}

// Head to Head types
export interface HeadToHeadEntry {
  opponentName: string;
  wins: number;
  losses: number;
}

export interface HeadToHeadMap {
  [teamId: string]: HeadToHeadEntry;
}

// Rankings related types
export interface Ranking {
  teamId: string;
  teamName: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  wins: number;
  losses: number;
  winPercentage: number;
  gamesWon: number;
  gamesLost: number;
  gameWinPercentage: number;
  sos: number;
  powerScore: number;
  streak?: string;
  rankChange?: number;
  previousRank?: number;
  divisionName?: string | null;
  headToHead: HeadToHeadMap;
  closeMatchLosses: number;
  divisionRank?: number;
}

// Types for playoff brackets - Export from the new centralized file
export * from './playoffs';

// Export bracket record types
export * from './bracketRecord';

// Export specific types from bracket.ts (excluding BracketFormat to avoid conflict)
export type {
  TeamBase,
  BracketMeta,
  PlayoffMatchSimple,
  BracketCreationRequest,
  BracketOperationResult,
  MatchStatus,
  MatchType,
} from './bracket';

// Division type
export interface Division {
  id: string;
  name: string;
  division_weight?: number;
  created_at?: string;
}

// Types for team timeslots
export interface TeamTimeslot {
  id: string;
  match_date: string;
  timeslot: string;
  team_id: string;
  created_at: string;
  teams?: {
    id: string;
    name: string;
    logo_url?: string | null;
    image_url?: string | null;
    divisionName: string | null;
  };
}

export * from './chart';
export * from './match';
export * from './admin';
