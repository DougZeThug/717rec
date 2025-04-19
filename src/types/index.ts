
export interface Team {
  id?: string;
  name: string;
  email?: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  players: string[];
  wins: number;
  losses: number;
  game_wins?: number;
  game_losses?: number;
  created_at: string;  // Ensure this is always a string
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
}
