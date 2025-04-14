export interface Player {
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  imageUrl?: string;
  players: Player[];
  wins: number;
  losses: number;
  created_at: string;
  division?: string;
  divisionName?: string; // Added divisionName to store the actual division name
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
  logoUrl?: string;
  wins: number;
  losses: number;
  winPercentage: number;
  sos?: number; // Strength of Schedule
}
