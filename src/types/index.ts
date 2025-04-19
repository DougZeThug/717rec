
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
