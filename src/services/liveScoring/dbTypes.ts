import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@/integrations/supabase/types';

// TEMPORARY hand-maintained mirror of the live-scoring migration
// (supabase/migrations/20260708120000_live_scoring.sql).
//
// TODO(live-scoring): delete this file (and liveDb.ts) and switch the
// live-scoring services to Tables<'match_rounds'> etc. once the migration has
// been applied in Lovable and src/integrations/supabase/types.ts regenerated.

export type LiveGameStatus = 'in_progress' | 'completed';

export type LiveGameRow = {
  id: string;
  match_id: string | null;
  game_number: number;
  team1_score: number | null;
  team2_score: number | null;
  status: LiveGameStatus;
  winner_team_id: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string;
};

export type LiveGameInsert = {
  id?: string;
  match_id: string;
  game_number: number;
  team1_score?: number | null;
  team2_score?: number | null;
  status?: LiveGameStatus;
  winner_team_id?: string | null;
  started_at?: string;
  completed_at?: string | null;
};

export type MatchRoundRow = {
  id: string;
  match_id: string;
  game_id: string;
  round_number: number;
  team1_score: number;
  team2_score: number;
  /** Generated in the database: abs(team1_score - team2_score). */
  net_points: number;
  /** Generated in the database: 1 | 2 | null (null = tied round). */
  winner_team: number | null;
  team1_thrower_id: string | null;
  team2_thrower_id: string | null;
  team1_bags_in: number | null;
  team1_bags_on: number | null;
  team1_bags_off: number | null;
  team2_bags_in: number | null;
  team2_bags_on: number | null;
  team2_bags_off: number | null;
  entered_by_user_id: string | null;
  created_at: string;
};

export type MatchRoundInsert = {
  id?: string;
  match_id: string;
  game_id: string;
  round_number: number;
  team1_score: number;
  team2_score: number;
  team1_thrower_id?: string | null;
  team2_thrower_id?: string | null;
  team1_bags_in?: number | null;
  team1_bags_on?: number | null;
  team1_bags_off?: number | null;
  team2_bags_in?: number | null;
  team2_bags_on?: number | null;
  team2_bags_off?: number | null;
  entered_by_user_id?: string | null;
};

export type GamePlayerRow = {
  id: string;
  game_id: string;
  team_id: string;
  player_id: string;
  slot: number;
  created_at: string;
};

export type GamePlayerInsert = {
  id?: string;
  game_id: string;
  team_id: string;
  player_id: string;
  slot: number;
};

export type TeamPlayerRow = {
  id: string;
  team_id: string;
  display_name: string;
  profile_id: string | null;
  is_active: boolean;
  created_at: string;
};

export type TeamPlayerInsert = {
  id?: string;
  team_id: string;
  display_name: string;
  profile_id?: string | null;
  is_active?: boolean;
};

export type PlayerMatchStatsRow = {
  match_id: string;
  player_id: string;
  team_id: string;
  display_name: string;
  season_id: string | null;
  rounds_thrown: number;
  rounds_won: number;
  points_for: number;
  points_against: number;
  net_points_won: number;
  bags_in: number | null;
  bags_on: number | null;
  bags_off: number | null;
  four_baggers: number;
};

export type PlayerSeasonStatsRow = {
  season_id: string | null;
  player_id: string;
  team_id: string;
  display_name: string;
  matches_with_rounds: number;
  rounds_thrown: number;
  rounds_won: number;
  points_for: number;
  points_against: number;
  net_points_won: number;
  bags_in: number | null;
  bags_on: number | null;
  bags_off: number | null;
  four_baggers: number;
  game_wins: number;
  game_losses: number;
  match_wins: number;
  match_losses: number;
};

export type TeamRoundStatsRow = {
  season_id: string | null;
  team_id: string;
  rounds_played: number;
  points_for: number;
  points_against: number;
  net_points_won: number;
};

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ViewDef<Row> = {
  Row: Row;
  Relationships: [];
};

export type LiveScoringDatabase = {
  __InternalSupabase: Database['__InternalSupabase'];
  public: Omit<Database['public'], 'Tables' | 'Views' | 'Functions'> & {
    Tables: Omit<Database['public']['Tables'], 'games'> & {
      games: TableDef<LiveGameRow, LiveGameInsert, Partial<LiveGameInsert>>;
      match_rounds: TableDef<MatchRoundRow, MatchRoundInsert, Partial<MatchRoundInsert>>;
      game_players: TableDef<GamePlayerRow, GamePlayerInsert, Partial<GamePlayerInsert>>;
      team_players: TableDef<TeamPlayerRow, TeamPlayerInsert, Partial<TeamPlayerInsert>>;
    };
    Views: Database['public']['Views'] & {
      v_player_match_stats: ViewDef<PlayerMatchStatsRow>;
      v_player_season_stats: ViewDef<PlayerSeasonStatsRow>;
      v_team_round_stats: ViewDef<TeamRoundStatsRow>;
    };
    Functions: Database['public']['Functions'] & {
      finalize_live_match: { Args: { p_match_id: string }; Returns: Json };
      reopen_live_match: { Args: { p_match_id: string }; Returns: boolean };
      user_can_score_match: { Args: { p_match_id: string }; Returns: boolean };
    };
  };
};

export type LiveScoringClient = SupabaseClient<LiveScoringDatabase>;
