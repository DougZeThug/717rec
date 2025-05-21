
/**
 * Generated Types for Supabase Database
 * DO NOT MODIFY - This file is auto-generated
 */

export interface BracketDto {
  id: string;
  title: string;
  format: string;
  state: string;
  division_id?: string;
  created_at?: string;
  challonge_tournament_id?: string;
  challonge_tournament_url?: string;
  wb_champion_id?: string;
  reset_match_needed?: boolean;
  migrated?: boolean;
  migrated_at?: string;
}

export interface MatchDto {
  id: string;
  bracket_id: string;
  round_number: number;
  position: number;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  loser_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  team1_game_wins: number | null;
  team2_game_wins: number | null;
  match_type: string;
  best_of: number;
  metadata?: {
    team1_seed?: number | null;
    team2_seed?: number | null;
  };
  next_win_match_id?: string | null;
  next_lose_match_id?: string | null;
  next_match_id?: string | null;
  next_loser_match_id?: string | null;
  status?: string;
  created_at?: string;
}
