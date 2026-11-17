import type { Tables } from '@/integrations/supabase/types';

/** One row of `v_team_details`, the view the scheduler reads real ratings from. */
export type RatingRow = Tables<'v_team_details'>;

/** A mid-table team that has played 10 matches. Pass only the columns that differ. */
export const ratingRow = (teamId: string, overrides: Partial<RatingRow> = {}): RatingRow => ({
  team_id: teamId,
  name: teamId,
  career_power_score: null,
  close_match_losses: null,
  created_at: null,
  division_id: null,
  divisionname: null,
  game_losses: 25,
  game_win_percentage: null,
  game_wins: 25,
  image_url: null,
  logo_url: null,
  losses: 5,
  players: null,
  power_score: 60,
  sos: 0.5,
  weighted_game_win_percentage: null,
  weighted_win_percentage: null,
  win_percentage: null,
  wins: 5,
  ...overrides,
});
