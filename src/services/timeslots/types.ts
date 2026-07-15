type TimeslotRowTeam = {
  id: string;
  name: string | null;
  logo_url?: string | null;
  image_url?: string | null;
};

export type TimeslotRow = {
  id: string;
  match_date: string;
  timeslot: string | null;
  team_id: string | null;
  created_at?: string | null;
  is_back_to_back?: boolean | null;
  is_double_header?: boolean | null;
  pair_slot?: string | null;
  match_sequence?: number | null;
  teams?: TimeslotRowTeam | null;
};
