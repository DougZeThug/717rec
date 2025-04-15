
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
  team1Score?: number;
  team2Score?: number;
  date: string;
  location: string;
  isCompleted: boolean;
  winnerId?: string;
  loserId?: string;
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

export interface Ranking {
  teamId: string;
  teamName: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  wins: number;
  losses: number;
  winPercentage: number;
  divisionName?: string | null;
  sos?: number; // Strength of Schedule
  streak?: string; // Current streak (e.g., "W3", "L2")
  previousRank?: number; // Previous week's rank
  rankChange?: number; // Change in rank (positive = improved, negative = declined)
  headToHead?: { [opponentId: string]: { wins: number; losses: number; opponentName: string } }; // Head-to-head records
}

export interface HeadToHeadRecord {
  opponentId: string;
  opponentName: string;
  wins: number;
  losses: number;
}
