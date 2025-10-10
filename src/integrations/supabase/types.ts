export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_privilege_changes: {
        Row: {
          changed_by_user_id: string | null
          created_at: string | null
          id: string
          new_admin_status: boolean | null
          old_admin_status: boolean | null
          target_user_id: string
        }
        Insert: {
          changed_by_user_id?: string | null
          created_at?: string | null
          id?: string
          new_admin_status?: boolean | null
          old_admin_status?: boolean | null
          target_user_id: string
        }
        Update: {
          changed_by_user_id?: string | null
          created_at?: string | null
          id?: string
          new_admin_status?: boolean | null
          old_admin_status?: boolean | null
          target_user_id?: string
        }
        Relationships: []
      }
      brackets: {
        Row: {
          challonge_tournament_id: number | null
          cn_bracket_id: string | null
          created_at: string | null
          division_id: string | null
          format: string | null
          id: string
          migrated: boolean | null
          migrated_at: string | null
          participants: Json | null
          reset_match_needed: boolean | null
          state: string | null
          title: string
          wb_champion_id: string | null
        }
        Insert: {
          challonge_tournament_id?: number | null
          cn_bracket_id?: string | null
          created_at?: string | null
          division_id?: string | null
          format?: string | null
          id?: string
          migrated?: boolean | null
          migrated_at?: string | null
          participants?: Json | null
          reset_match_needed?: boolean | null
          state?: string | null
          title: string
          wb_champion_id?: string | null
        }
        Update: {
          challonge_tournament_id?: number | null
          cn_bracket_id?: string | null
          created_at?: string | null
          division_id?: string | null
          format?: string | null
          id?: string
          migrated?: boolean | null
          migrated_at?: string | null
          participants?: Json | null
          reset_match_needed?: boolean | null
          state?: string | null
          title?: string
          wb_champion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brackets_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brackets_wb_champion_id_fkey"
            columns: ["wb_champion_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brackets_wb_champion_id_fkey"
            columns: ["wb_champion_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "brackets_wb_champion_id_fkey"
            columns: ["wb_champion_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "brackets_wb_champion_id_fkey"
            columns: ["wb_champion_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "brackets_wb_champion_id_fkey"
            columns: ["wb_champion_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "brackets_wb_champion_id_fkey"
            columns: ["wb_champion_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "brackets_wb_champion_id_fkey"
            columns: ["wb_champion_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "brackets_wb_champion_id_fkey"
            columns: ["wb_champion_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "brackets_wb_champion_id_fkey"
            columns: ["wb_champion_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "brackets_wb_champion_id_fkey"
            columns: ["wb_champion_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      debug_match_updates: {
        Row: {
          id: string
          inserted_at: string | null
          match_id: string | null
          team1_game_wins: number | null
          team1_score: number | null
          team2_game_wins: number | null
          team2_score: number | null
          user_id: string | null
        }
        Insert: {
          id?: string
          inserted_at?: string | null
          match_id?: string | null
          team1_game_wins?: number | null
          team1_score?: number | null
          team2_game_wins?: number | null
          team2_score?: number | null
          user_id?: string | null
        }
        Update: {
          id?: string
          inserted_at?: string | null
          match_id?: string | null
          team1_game_wins?: number | null
          team1_score?: number | null
          team2_game_wins?: number | null
          team2_score?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      divisions: {
        Row: {
          created_at: string | null
          display_division: string | null
          division_weight: number | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          display_division?: string | null
          division_weight?: number | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          display_division?: string | null
          division_weight?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          created_at: string | null
          game_number: number
          id: string
          match_id: string | null
          team1_score: number | null
          team2_score: number | null
        }
        Insert: {
          created_at?: string | null
          game_number: number
          id?: string
          match_id?: string | null
          team1_score?: number | null
          team2_score?: number | null
        }
        Update: {
          created_at?: string | null
          game_number?: number
          id?: string
          match_id?: string | null
          team1_score?: number | null
          team2_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "games_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          match_id: string
          team_name: string | null
          user_id: string
          username: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          match_id: string
          team_name?: string | null
          user_id: string
          username: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          match_id?: string
          team_name?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_comments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_comments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          match_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          match_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_reactions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_reactions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          best_of: number | null
          bracket_id: string | null
          created_at: string | null
          date: string | null
          id: string
          iscompleted: boolean | null
          location: string | null
          loser_id: string | null
          match_type: Database["public"]["Enums"]["match_type"] | null
          metadata: Json | null
          next_loser_match_id: string | null
          next_match_id: string | null
          position: number | null
          round_number: number
          season_id: string | null
          team1_game_wins: number | null
          team1_id: string | null
          team1_score: number | null
          team2_game_wins: number | null
          team2_id: string | null
          team2_score: number | null
          winner_id: string | null
        }
        Insert: {
          best_of?: number | null
          bracket_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          iscompleted?: boolean | null
          location?: string | null
          loser_id?: string | null
          match_type?: Database["public"]["Enums"]["match_type"] | null
          metadata?: Json | null
          next_loser_match_id?: string | null
          next_match_id?: string | null
          position?: number | null
          round_number: number
          season_id?: string | null
          team1_game_wins?: number | null
          team1_id?: string | null
          team1_score?: number | null
          team2_game_wins?: number | null
          team2_id?: string | null
          team2_score?: number | null
          winner_id?: string | null
        }
        Update: {
          best_of?: number | null
          bracket_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          iscompleted?: boolean | null
          location?: string | null
          loser_id?: string | null
          match_type?: Database["public"]["Enums"]["match_type"] | null
          metadata?: Json | null
          next_loser_match_id?: string | null
          next_match_id?: string | null
          position?: number | null
          round_number?: number
          season_id?: string | null
          team1_game_wins?: number | null
          team1_id?: string | null
          team1_score?: number | null
          team2_game_wins?: number | null
          team2_id?: string | null
          team2_score?: number | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches_archive: {
        Row: {
          archived_at: string | null
          best_of: number | null
          bracket_id: string | null
          created_at: string | null
          date: string | null
          id: string
          iscompleted: boolean | null
          location: string | null
          loser_id: string | null
          match_type: Database["public"]["Enums"]["match_type"] | null
          metadata: Json | null
          next_loser_match_id: string | null
          next_match_id: string | null
          position: number | null
          round_number: number
          season_id: string | null
          team1_game_wins: number | null
          team1_id: string | null
          team1_score: number | null
          team2_game_wins: number | null
          team2_id: string | null
          team2_score: number | null
          winner_id: string | null
        }
        Insert: {
          archived_at?: string | null
          best_of?: number | null
          bracket_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          iscompleted?: boolean | null
          location?: string | null
          loser_id?: string | null
          match_type?: Database["public"]["Enums"]["match_type"] | null
          metadata?: Json | null
          next_loser_match_id?: string | null
          next_match_id?: string | null
          position?: number | null
          round_number: number
          season_id?: string | null
          team1_game_wins?: number | null
          team1_id?: string | null
          team1_score?: number | null
          team2_game_wins?: number | null
          team2_id?: string | null
          team2_score?: number | null
          winner_id?: string | null
        }
        Update: {
          archived_at?: string | null
          best_of?: number | null
          bracket_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          iscompleted?: boolean | null
          location?: string | null
          loser_id?: string | null
          match_type?: Database["public"]["Enums"]["match_type"] | null
          metadata?: Json | null
          next_loser_match_id?: string | null
          next_match_id?: string | null
          position?: number | null
          round_number?: number
          season_id?: string | null
          team1_game_wins?: number | null
          team1_id?: string | null
          team1_score?: number | null
          team2_game_wins?: number | null
          team2_id?: string | null
          team2_score?: number | null
          winner_id?: string | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_edited: boolean | null
          team_id: string | null
          team_name: string | null
          updated_at: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          team_id?: string | null
          team_name?: string | null
          updated_at?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          team_id?: string | null
          team_name?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          bracket_id: string
          cn_participant_id: string | null
          id: string
          name: string | null
          position: number
          seeding: number | null
          team_id: string
          tournament_id: string | null
        }
        Insert: {
          bracket_id: string
          cn_participant_id?: string | null
          id?: string
          name?: string | null
          position: number
          seeding?: number | null
          team_id: string
          tournament_id?: string | null
        }
        Update: {
          bracket_id?: string
          cn_participant_id?: string | null
          id?: string
          name?: string | null
          position?: number
          seeding?: number | null
          team_id?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      playoff_games: {
        Row: {
          created_at: string | null
          game_number: number
          id: string
          match_id: string | null
          team1_score: number
          team2_score: number
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          game_number: number
          id?: string
          match_id?: string | null
          team1_score: number
          team2_score: number
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          game_number?: number
          id?: string
          match_id?: string | null
          team1_score?: number
          team2_score?: number
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playoff_games_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "playoff_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "playoff_games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "playoff_games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      playoff_matches: {
        Row: {
          best_of: number | null
          bracket_id: string | null
          created_at: string | null
          id: string
          loser_id: string | null
          match_type: Database["public"]["Enums"]["playoff_match_type"]
          next_lose_match_id: string | null
          next_win_match_id: string | null
          position: number
          round: number
          status: string | null
          team1_id: string | null
          team1_score: number | null
          team1_seed: number | null
          team2_id: string | null
          team2_score: number | null
          team2_seed: number | null
          updated_at: string | null
          winner_id: string | null
        }
        Insert: {
          best_of?: number | null
          bracket_id?: string | null
          created_at?: string | null
          id?: string
          loser_id?: string | null
          match_type?: Database["public"]["Enums"]["playoff_match_type"]
          next_lose_match_id?: string | null
          next_win_match_id?: string | null
          position: number
          round: number
          status?: string | null
          team1_id?: string | null
          team1_score?: number | null
          team1_seed?: number | null
          team2_id?: string | null
          team2_score?: number | null
          team2_seed?: number | null
          updated_at?: string | null
          winner_id?: string | null
        }
        Update: {
          best_of?: number | null
          bracket_id?: string | null
          created_at?: string | null
          id?: string
          loser_id?: string | null
          match_type?: Database["public"]["Enums"]["playoff_match_type"]
          next_lose_match_id?: string | null
          next_win_match_id?: string | null
          position?: number
          round?: number
          status?: string | null
          team1_id?: string | null
          team1_score?: number | null
          team1_seed?: number | null
          team2_id?: string | null
          team2_score?: number | null
          team2_seed?: number | null
          updated_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_playoff_matches_bracket"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team1"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team1"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team1"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team1"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team1"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team1"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team1"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team1"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team1"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team1"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team2"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team2"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team2"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team2"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team2"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team2"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team2"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team2"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team2"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fk_playoff_matches_team2"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_matches_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "playoff_matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "playoff_matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_matches_next_lose_match_id_fkey"
            columns: ["next_lose_match_id"]
            isOneToOne: false
            referencedRelation: "playoff_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_matches_next_win_match_id_fkey"
            columns: ["next_win_match_id"]
            isOneToOne: false
            referencedRelation: "playoff_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "playoff_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "playoff_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "playoff_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "playoff_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "playoff_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "playoff_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      playoff_team_records: {
        Row: {
          bracket_id: string | null
          game_losses: number | null
          game_wins: number | null
          id: string
          inserted_at: string | null
          losses: number | null
          placement: number | null
          team_id: string | null
          updated_at: string | null
          wins: number | null
        }
        Insert: {
          bracket_id?: string | null
          game_losses?: number | null
          game_wins?: number | null
          id?: string
          inserted_at?: string | null
          losses?: number | null
          placement?: number | null
          team_id?: string | null
          updated_at?: string | null
          wins?: number | null
        }
        Update: {
          bracket_id?: string | null
          game_losses?: number | null
          game_wins?: number | null
          id?: string
          inserted_at?: string | null
          losses?: number | null
          placement?: number | null
          team_id?: string | null
          updated_at?: string | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "playoff_team_records_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_team_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_team_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "playoff_team_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "playoff_team_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_team_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_team_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_team_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_team_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_team_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "playoff_team_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
      score_submissions: {
        Row: {
          created_at: string
          id: string
          match_id: string
          message: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitter_name: string
          submitter_team: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          message: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitter_name: string
          submitter_team?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          message?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitter_name?: string
          submitter_team?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "score_submissions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_submissions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          champion_team_id: string | null
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          is_archived: boolean
          name: string
          runner_up_team_id: string | null
          start_date: string
          third_place_team_id: string | null
          updated_at: string
        }
        Insert: {
          champion_team_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name: string
          runner_up_team_id?: string | null
          start_date?: string
          third_place_team_id?: string | null
          updated_at?: string
        }
        Update: {
          champion_team_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name?: string
          runner_up_team_id?: string | null
          start_date?: string
          third_place_team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "seasons_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "seasons_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_runner_up_team_id_fkey"
            columns: ["runner_up_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_runner_up_team_id_fkey"
            columns: ["runner_up_team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "seasons_runner_up_team_id_fkey"
            columns: ["runner_up_team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "seasons_runner_up_team_id_fkey"
            columns: ["runner_up_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_runner_up_team_id_fkey"
            columns: ["runner_up_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_runner_up_team_id_fkey"
            columns: ["runner_up_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_runner_up_team_id_fkey"
            columns: ["runner_up_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_runner_up_team_id_fkey"
            columns: ["runner_up_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_runner_up_team_id_fkey"
            columns: ["runner_up_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_runner_up_team_id_fkey"
            columns: ["runner_up_team_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_third_place_team_id_fkey"
            columns: ["third_place_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_third_place_team_id_fkey"
            columns: ["third_place_team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "seasons_third_place_team_id_fkey"
            columns: ["third_place_team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "seasons_third_place_team_id_fkey"
            columns: ["third_place_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_third_place_team_id_fkey"
            columns: ["third_place_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_third_place_team_id_fkey"
            columns: ["third_place_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_third_place_team_id_fkey"
            columns: ["third_place_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_third_place_team_id_fkey"
            columns: ["third_place_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_third_place_team_id_fkey"
            columns: ["third_place_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_third_place_team_id_fkey"
            columns: ["third_place_team_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      team_badge_events: {
        Row: {
          awarded_at: string
          badge_type: Database["public"]["Enums"]["badge_type"]
          created_at: string
          id: string
          is_active: boolean
          metadata: Json | null
          season_id: string | null
          team_id: string
        }
        Insert: {
          awarded_at?: string
          badge_type: Database["public"]["Enums"]["badge_type"]
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          season_id?: string | null
          team_id: string
        }
        Update: {
          awarded_at?: string
          badge_type?: Database["public"]["Enums"]["badge_type"]
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          season_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_badge_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_badge_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "team_badge_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "team_badge_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_badge_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "team_badge_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "team_badge_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_badge_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_badge_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_badge_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_badge_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_badge_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_badge_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_details_archive: {
        Row: {
          close_match_losses: number | null
          created_at: string | null
          division_id: string | null
          divisionname: string | null
          game_losses: number | null
          game_win_percentage: number | null
          game_wins: number | null
          image_url: string | null
          logo_url: string | null
          losses: number | null
          name: string | null
          players: string[] | null
          power_score: number | null
          season_id: string
          snapshot_at: string | null
          sos: number | null
          team_id: string
          weighted_game_win_percentage: number | null
          weighted_win_percentage: number | null
          win_percentage: number | null
          wins: number | null
        }
        Insert: {
          close_match_losses?: number | null
          created_at?: string | null
          division_id?: string | null
          divisionname?: string | null
          game_losses?: number | null
          game_win_percentage?: number | null
          game_wins?: number | null
          image_url?: string | null
          logo_url?: string | null
          losses?: number | null
          name?: string | null
          players?: string[] | null
          power_score?: number | null
          season_id: string
          snapshot_at?: string | null
          sos?: number | null
          team_id: string
          weighted_game_win_percentage?: number | null
          weighted_win_percentage?: number | null
          win_percentage?: number | null
          wins?: number | null
        }
        Update: {
          close_match_losses?: number | null
          created_at?: string | null
          division_id?: string | null
          divisionname?: string | null
          game_losses?: number | null
          game_win_percentage?: number | null
          game_wins?: number | null
          image_url?: string | null
          logo_url?: string | null
          losses?: number | null
          name?: string | null
          players?: string[] | null
          power_score?: number | null
          season_id?: string
          snapshot_at?: string | null
          sos?: number | null
          team_id?: string
          weighted_game_win_percentage?: number | null
          weighted_win_percentage?: number | null
          win_percentage?: number | null
          wins?: number | null
        }
        Relationships: []
      }
      team_memberships: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          id: string
          is_approved: boolean
          joined_at: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          is_approved?: boolean
          joined_at?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          is_approved?: boolean
          joined_at?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_season_opt_out: {
        Row: {
          created_at: string | null
          season_id: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          season_id: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          season_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_season_opt_out_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_season_opt_out_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "team_season_opt_out_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "team_season_opt_out_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_season_opt_out_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "team_season_opt_out_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "team_season_opt_out_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_season_opt_out_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_season_opt_out_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_season_opt_out_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_season_opt_out_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_season_opt_out_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_season_opt_out_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_season_stats: {
        Row: {
          champion: boolean | null
          division_name: string | null
          game_losses: number
          game_wins: number
          match_losses: number
          match_wins: number
          playoff_rank: number | null
          power_score: number | null
          recorded_at: string | null
          runner_up: boolean
          season_id: string
          sos: number | null
          team_id: string
        }
        Insert: {
          champion?: boolean | null
          division_name?: string | null
          game_losses: number
          game_wins: number
          match_losses: number
          match_wins: number
          playoff_rank?: number | null
          power_score?: number | null
          recorded_at?: string | null
          runner_up?: boolean
          season_id: string
          sos?: number | null
          team_id: string
        }
        Update: {
          champion?: boolean | null
          division_name?: string | null
          game_losses?: number
          game_wins?: number
          match_losses?: number
          match_wins?: number
          playoff_rank?: number | null
          power_score?: number | null
          recorded_at?: string | null
          runner_up?: boolean
          season_id?: string
          sos?: number | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_season_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_season_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "team_season_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "team_season_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_season_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "team_season_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "team_season_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_season_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_season_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_season_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_season_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_season_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_season_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_stats: {
        Row: {
          created_at: string | null
          current_rank: number | null
          head_to_head: Json | null
          id: string
          losses: number
          previous_rank: number | null
          rank_change: number | null
          snapshot_date: string | null
          sos: number | null
          streak: string | null
          team_id: string | null
          win_percentage: number | null
          wins: number
        }
        Insert: {
          created_at?: string | null
          current_rank?: number | null
          head_to_head?: Json | null
          id?: string
          losses: number
          previous_rank?: number | null
          rank_change?: number | null
          snapshot_date?: string | null
          sos?: number | null
          streak?: string | null
          team_id?: string | null
          win_percentage?: number | null
          wins: number
        }
        Update: {
          created_at?: string | null
          current_rank?: number | null
          head_to_head?: Json | null
          id?: string
          losses?: number
          previous_rank?: number | null
          rank_change?: number | null
          snapshot_date?: string | null
          sos?: number | null
          streak?: string | null
          team_id?: string | null
          win_percentage?: number | null
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "team_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "team_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_timeslots: {
        Row: {
          created_at: string | null
          id: string
          is_back_to_back: boolean
          match_date: string
          match_sequence: number | null
          pair_slot: string | null
          team_id: string | null
          timeslot: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_back_to_back?: boolean
          match_date: string
          match_sequence?: number | null
          pair_slot?: string | null
          team_id?: string | null
          timeslot?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_back_to_back?: boolean
          match_date?: string
          match_sequence?: number | null
          pair_slot?: string | null
          team_id?: string | null
          timeslot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_timeslots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_timeslots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team1_id"]
          },
          {
            foreignKeyName: "team_timeslots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_pending_matches"
            referencedColumns: ["team2_id"]
          },
          {
            foreignKeyName: "team_timeslots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_timeslots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_details_with_season"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_timeslots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_game_totals"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_timeslots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_power_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_timeslots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_season_agg"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_timeslots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_timeslots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_visible_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          challonge_participant_id: number | null
          created_at: string | null
          division_id: string | null
          game_losses: number | null
          game_wins: number | null
          id: string
          image_url: string | null
          logo_url: string | null
          losses: number
          name: string
          players: string[] | null
          seed: number | null
          spotify_url: string | null
          wins: number
        }
        Insert: {
          challonge_participant_id?: number | null
          created_at?: string | null
          division_id?: string | null
          game_losses?: number | null
          game_wins?: number | null
          id?: string
          image_url?: string | null
          logo_url?: string | null
          losses?: number
          name: string
          players?: string[] | null
          seed?: number | null
          spotify_url?: string | null
          wins?: number
        }
        Update: {
          challonge_participant_id?: number | null
          created_at?: string | null
          division_id?: string | null
          game_losses?: number | null
          game_wins?: number | null
          id?: string
          image_url?: string | null
          logo_url?: string | null
          losses?: number
          name?: string
          players?: string[] | null
          seed?: number | null
          spotify_url?: string | null
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_head_to_head: {
        Row: {
          game_losses: number | null
          game_wins: number | null
          last_played_at: string | null
          losses: number | null
          matches_played: number | null
          opponent_id: string | null
          team_id: string | null
          win_pct: number | null
          wins: number | null
        }
        Relationships: []
      }
      v_head_to_head_pairs: {
        Row: {
          a_game_wins: number | null
          a_id: string | null
          a_match_wins: number | null
          b_game_wins: number | null
          b_id: string | null
          b_match_wins: number | null
          last_played_at: string | null
          matches_played: number | null
        }
        Relationships: []
      }
      v_match_pairs: {
        Row: {
          a_game_wins: number | null
          a_id: string | null
          a_match_score: number | null
          b_game_wins: number | null
          b_id: string | null
          b_match_score: number | null
          completed_at: string | null
          match_id: string | null
          season_id: string | null
        }
        Relationships: []
      }
      v_pending_matches: {
        Row: {
          date: string | null
          id: string | null
          location: string | null
          team1_id: string | null
          team1_logo: string | null
          team1_name: string | null
          team2_id: string | null
          team2_logo: string | null
          team2_name: string | null
        }
        Relationships: []
      }
      v_team_details: {
        Row: {
          close_match_losses: number | null
          created_at: string | null
          division_id: string | null
          divisionname: string | null
          game_losses: number | null
          game_win_percentage: number | null
          game_wins: number | null
          image_url: string | null
          logo_url: string | null
          losses: number | null
          name: string | null
          players: string[] | null
          power_score: number | null
          sos: number | null
          team_id: string | null
          weighted_game_win_percentage: number | null
          weighted_win_percentage: number | null
          win_percentage: number | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      v_team_details_with_season: {
        Row: {
          close_match_losses: number | null
          created_at: string | null
          division_id: string | null
          divisionname: string | null
          game_losses: number | null
          game_win_percentage: number | null
          game_wins: number | null
          image_url: string | null
          logo_url: string | null
          losses: number | null
          name: string | null
          players: string[] | null
          power_score: number | null
          season_id: string | null
          sos: number | null
          team_id: string | null
          weighted_game_win_percentage: number | null
          weighted_win_percentage: number | null
          win_percentage: number | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      v_team_game_totals: {
        Row: {
          division_id: string | null
          game_losses: number | null
          game_wins: number | null
          logo_url: string | null
          losses: number | null
          name: string | null
          team_id: string | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      v_team_match_stats: {
        Row: {
          close_match_losses: number | null
          game_losses: number | null
          game_win_percentage: number | null
          game_wins: number | null
          losses: number | null
          team_id: string | null
          win_percentage: number | null
          wins: number | null
        }
        Relationships: []
      }
      v_team_power_scores: {
        Row: {
          close_match_losses: number | null
          division_id: string | null
          game_losses: number | null
          game_win_percentage: number | null
          game_wins: number | null
          losses: number | null
          power_score: number | null
          sos: number | null
          team_id: string | null
          team_name: string | null
          win_percentage: number | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      v_team_season_agg: {
        Row: {
          game_losses: number | null
          game_wins: number | null
          match_losses: number | null
          match_wins: number | null
          power_score: number | null
          season_id: string | null
          sos: number | null
          team_id: string | null
        }
        Relationships: []
      }
      v_team_sos: {
        Row: {
          sos: number | null
          team_id: string | null
        }
        Relationships: []
      }
      v_team_strength_of_schedule: {
        Row: {
          close_match_losses: number | null
          division_id: string | null
          game_losses: number | null
          game_win_percentage: number | null
          game_wins: number | null
          losses: number | null
          sos: number | null
          team_id: string | null
          team_name: string | null
          win_percentage: number | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      v_visible_teams: {
        Row: {
          challonge_participant_id: number | null
          created_at: string | null
          division_id: string | null
          game_losses: number | null
          game_wins: number | null
          id: string | null
          image_url: string | null
          logo_url: string | null
          losses: number | null
          name: string | null
          players: string[] | null
          seed: number | null
          wins: number | null
        }
        Insert: {
          challonge_participant_id?: number | null
          created_at?: string | null
          division_id?: string | null
          game_losses?: number | null
          game_wins?: number | null
          id?: string | null
          image_url?: string | null
          logo_url?: string | null
          losses?: number | null
          name?: string | null
          players?: string[] | null
          seed?: number | null
          wins?: number | null
        }
        Update: {
          challonge_participant_id?: number | null
          created_at?: string | null
          division_id?: string | null
          game_losses?: number | null
          game_wins?: number | null
          id?: string | null
          image_url?: string | null
          logo_url?: string | null
          losses?: number | null
          name?: string | null
          players?: string[] | null
          seed?: number | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_assign_seeds: {
        Args: { p_division_id: string }
        Returns: undefined
      }
      award_clutch_performer_badge: {
        Args: { p_team_id: string }
        Returns: Json
      }
      award_consistent_performer_badge: {
        Args: { p_team_id: string }
        Returns: Json
      }
      award_kingslayer_badge: {
        Args: { p_loser_id: string; p_winner_id: string }
        Returns: Json
      }
      award_streak_badges: {
        Args: { p_team_id: string }
        Returns: Json
      }
      batch_update_team_seeds: {
        Args: { p_updates: Json }
        Returns: Json
      }
      calculate_team_streak: {
        Args: { p_team_id: string }
        Returns: {
          streak_count: number
          streak_type: string
        }[]
      }
      current_user_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_all_team_badges: {
        Args: Record<PropertyKey, never>
        Returns: {
          awarded_at: string
          badge_type: string
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          season_id: string
          team_id: string
        }[]
      }
      get_head_to_head_records: {
        Args: { p_team_id?: string }
        Returns: {
          game_losses: number
          game_wins: number
          last_played_at: string
          losses: number
          matches_played: number
          opponent_id: string
          team_id: string
          win_pct: number
          wins: number
        }[]
      }
      get_opponent_match_history: {
        Args: { p_opponent_id: string; p_team_id: string }
        Returns: {
          date: string
          id: string
          location: string
          team1_game_wins: number
          team1_name: string
          team1_score: number
          team2_game_wins: number
          team2_name: string
          team2_score: number
          winner_name: string
        }[]
      }
      get_participants: {
        Args: { p_tournament_id: string }
        Returns: {
          id: string
          name: string
          team_position: number
          tournament_id: string
        }[]
      }
      get_season_badges: {
        Args: { p_season_id: string }
        Returns: {
          awarded_at: string
          badge_type: string
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          season_id: string
          team_id: string
        }[]
      }
      get_team_badges: {
        Args: { p_team_id: string }
        Returns: {
          awarded_at: string
          badge_type: string
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          season_id: string
          team_id: string
        }[]
      }
      get_team_division_weight: {
        Args: { team_id: string }
        Returns: number
      }
      insert_participant: {
        Args: {
          p_bracket_id: string
          p_team_id: string
          p_team_position: number
        }
        Returns: undefined
      }
      log_security_operation: {
        Args: {
          p_action: string
          p_new_values?: Json
          p_old_values?: Json
          p_record_id?: string
          p_table_name?: string
        }
        Returns: undefined
      }
      process_match_badges: {
        Args: { p_team1_id: string; p_team2_id: string }
        Returns: Json
      }
      reset_division_seeds: {
        Args: { p_division_id: string }
        Returns: undefined
      }
      snapshot_current_season: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_team_stats: {
        Args:
          | Record<PropertyKey, never>
          | {
              p_loser_game_wins?: number
              p_loser_id: string
              p_winner_game_wins?: number
              p_winner_id: string
            }
          | { team_id: string }
        Returns: undefined
      }
      upsert_team_season_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_belongs_to_team: {
        Args: { p_team_id: string }
        Returns: boolean
      }
      validate_division_seeds: {
        Args: { p_division_id: string }
        Returns: {
          conflict_count: number
          seed: number
          team_id: string
          team_name: string
        }[]
      }
    }
    Enums: {
      badge_type:
        | "recreational_champion"
        | "intermediate_champion"
        | "competitive_champion"
        | "recreational_runner_up"
        | "intermediate_runner_up"
        | "competitive_runner_up"
        | "recreational_third_place"
        | "intermediate_third_place"
        | "competitive_third_place"
        | "king_slayer"
        | "clutch_performer"
        | "consistent_performer"
        | "hot_streak"
        | "cold_streak"
        | "cool_fun_team"
      match_type: "winners" | "losers" | "finals"
      playoff_match_type:
        | "winners"
        | "losers"
        | "finals"
        | "play-in"
        | "play-in-2"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      badge_type: [
        "recreational_champion",
        "intermediate_champion",
        "competitive_champion",
        "recreational_runner_up",
        "intermediate_runner_up",
        "competitive_runner_up",
        "recreational_third_place",
        "intermediate_third_place",
        "competitive_third_place",
        "king_slayer",
        "clutch_performer",
        "consistent_performer",
        "hot_streak",
        "cold_streak",
        "cool_fun_team",
      ],
      match_type: ["winners", "losers", "finals"],
      playoff_match_type: [
        "winners",
        "losers",
        "finals",
        "play-in",
        "play-in-2",
      ],
    },
  },
} as const
