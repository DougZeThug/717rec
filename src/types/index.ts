export interface Team {
  id: string;
  name: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  division?: string | null; 
  divisionName?: string | null;
  players?: string[];
  wins: number;
  losses: number;
  game_wins?: number;
  game_losses?: number;
  power_score: number;
  sos: number;
  win_percentage: number;
  game_win_percentage: number;
  close_match_losses?: number;
  created_at?: string;
  [key: string]: any;
}

export interface Match {
  id: string;
  team1Id: string;
  team2Id: string;
  team1Score?: number | null;
  team2Score?: number | null;
  date?: string;
  location?: string;
  iscompleted?: boolean;
  winnerId?: string | null;
  loserId?: string | null;
  round_number?: number;
  position?: number;
  bracket_id?: string;
  match_type?: string;
  next_match_id?: string;
  next_loser_match_id?: string;
  best_of?: number;
  team1_game_wins?: number;
  team2_game_wins?: number;
  created_at?: string;
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

// Types for playoff brackets
export interface PlayoffMatch {
  id: string;
  round: number;
  position: number;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  team1Score: number;
  team2Score: number;
  matchType: "Winners" | "Losers" | "Finals";
  bestOf: number;
  games: PlayoffGame[];
}

export interface PlayoffGame {
  id: string;
  team1Score: number;
  team2Score: number;
  winner: string; // 'team1Id' or 'team2Id'
}

export interface PlayoffBracket {
  id: string;
  name: string;
  division: string;
  matches: PlayoffMatch[];
  format: "Single Elimination" | "Double Elimination";
  champion?: string | null;
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
    logo_url?: string;
    divisionName: string | null;
  };
}

// Types for team rankings
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
  headToHead: Record<string, { wins: number; losses: number; }>;
  closeMatchLosses: number;
  divisionRank?: number;
}

export interface HeadToHeadMap {
  [teamId: string]: {
    opponentName: string;
    wins: number;
    losses: number;
  };
}

// Division type
export interface Division {
  id: string;
  name: string;
  division_weight?: number;
  created_at?: string;
}
