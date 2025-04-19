export interface Player {
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface Division {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  players: string[];
  wins: number;
  losses: number;
  game_wins?: number;
  game_losses?: number;
  created_at: string;
  division?: string | null;
  divisionName?: string | null;
  sos?: number;
  close_match_losses?: number;
  power_score?: number;
}

export interface Match {
  id: string;
  team1Id: string;
  team2Id: string;
  team1Score?: number | null;
  team2Score?: number | null;
  date: string | null;
  location: string | null;
  iscompleted: boolean;
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
  team1GameWins?: number | null;
  team2GameWins?: number | null;
  team1_id?: string;
  team2_id?: string;
  team1_score?: number | null;
  team2_score?: number | null;
  team1_game_wins?: number | null;
  team2_game_wins?: number | null;
  winner_id?: string | null;
  loser_id?: string | null;
}

export interface TeamTimeslot {
  id: string;
  match_date: string;
  team_id: string | null;
  timeslot: string | null;
  created_at?: string;
  teams?: { 
    name: string;
    id: string;
    divisionName?: string | null;
    logo_url?: string | null;
  };
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

export interface HeadToHeadRecord {
  opponentId: string;
  opponentName: string;
  wins: number;
  losses: number;
}

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
  rankChange?: number;
  gamesWon?: number;
  gamesLost?: number;
  gameWinPercentage?: number;
  closeMatchLosses?: number;
  powerScore?: number;
}

export interface TeamStat {
  id: string;
  team_id: string;
  wins: number;
  losses: number;
  win_percentage?: number;
  sos?: number;
  streak?: string;
  previous_rank?: number;
  current_rank?: number;
  rank_change?: number;
  head_to_head?: Record<string, { wins: number; losses: number; opponentName: string }>;
  snapshot_date: string;
  created_at: string;
}
