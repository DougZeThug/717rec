export interface Team {
  id: string;
  name: string;
  wins?: number;
  losses?: number;
  game_wins?: number;
  game_losses?: number;
  divisionName?: string | null;
  division_id?: string | null;
  division?: string | null;
  imageUrl?: string | null;
  logoUrl?: string | null;
  players?: string[];
  seed?: number;

  power_score?: number | null;
  /** Floored (earned-schedule) rating used by Career rankings only. */
  career_power_score?: number | null;
  sos?: number | null;
  win_percentage?: number;
  game_win_percentage?: number;
  created_at?: string;
  close_match_losses?: number | null;
}
