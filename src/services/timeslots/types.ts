export type TimeslotRowTeam = {
  id: string;
  name: string | null;
  logo_url?: string | null;
  image_url?: string | null;
};

export type TimeslotRow = {
  id: string;
  match_date: string;
  timeslot: string;
  team_id: string;
  created_at?: string | null;
  is_back_to_back?: boolean | null;
  is_double_header?: boolean | null;
  pair_slot?: string | null;
  match_sequence?: number | null;
  teams?: TimeslotRowTeam | null;
};

export type TimeslotWithTeamsRow = TimeslotRow & {
  teams: (TimeslotRowTeam & {
    players?: unknown[] | null;
    wins?: number | null;
    losses?: number | null;
    game_wins?: number | null;
    game_losses?: number | null;
    division_id?: string | null;
    divisions?: { name?: string | null; display_division?: string | null } | null;
  }) | null;
};
