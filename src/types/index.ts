
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
  players: Player[];
  wins: number;
  losses: number;
  created_at: string;
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
