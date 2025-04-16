export interface Player {
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface Team {
  id: string;
  name: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  players: Player[];
  wins: number;
  losses: number;
  created_at: string;
  division?: string | null;
  divisionName?: string | null;
}

export interface Match {
  id: string;
  team1Id: string;
  team2Id: string;
  team1Score?: number | null;
  team2Score?: number | null;
  date: string | null;
  location: string | null;
  iscompleted: boolean; // Matches Supabase column name
  winnerId?: string | null;
  loserId?: string | null;
  round_number?: number;
  position?: number;
  bracket_id?: string;
  match_type?: "winners" | "losers" | "finals";
  next_match_id?: string;
  next_loser_match_id?: string;
  best_of?: number;
  created_at?: string;
}

export interface TeamTimeslot {
  id: string;
  match_date: string;
  team_id: string | null;
  timeslot: string | null;
  created_at?: string;
}

export interface PlayoffBracket {
  id: string;
  name: string;
  division: string;
  matches: PlayoffMatch[];
  champion?: string;
  format: "Single Elimination" | "Double Elimination";
}

export interface PlayoffMatch {
  id: string;
  round: number;
  position: number;
  team1Id?: string;
  team2Id?: string;
  winnerId?: string;
  team1Score?: number;
  team2Score?: number;
  matchType?: "Winners" | "Losers" | "Finals";
  games?: PlayoffGame[];
  bestOf: number;
}

export interface PlayoffGame {
  id: string;
  team1Score: number;
  team2Score: number;
  winner: string;
}

// Define HeadToHeadRecord separately to solve excessive depth issue
export interface HeadToHeadRecord {
  opponentId: string;
  opponentName: string;
  wins: number;
  losses: number;
}

// Use HeadToHeadMap as alias to avoid deep nested type
export type HeadToHeadMap = Record<string, { 
  wins: number; 
  losses: number; 
  opponentName: string 
}>;

export interface Ranking {
  teamId: string;
  teamName: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  wins: number;
  losses: number;
  winPercentage: number;
  divisionName?: string | null;
  sos?: number;
  streak?: string;
  headToHead?: HeadToHeadMap;
  previousRank?: number;
  rankChange?: number; // Added to fix type access error
}
