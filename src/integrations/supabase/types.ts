export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      brackets: {
        Row: {
          created_at: string | null
          division_id: string | null
          format: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          division_id?: string | null
          format?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          division_id?: string | null
          format?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "brackets_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          created_at: string | null
          division_weight: number | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          division_weight?: number | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
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
          next_loser_match_id: string | null
          next_match_id: string | null
          position: number | null
          round_number: number
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
          next_loser_match_id?: string | null
          next_match_id?: string | null
          position?: number | null
          round_number: number
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
          next_loser_match_id?: string | null
          next_match_id?: string | null
          position?: number | null
          round_number?: number
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
            referencedRelation: "v_team_details"
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
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
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
            referencedRelation: "v_team_details"
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
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
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
            referencedRelation: "v_team_details"
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
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
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
            referencedRelation: "v_team_details"
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
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
        ]
      }
      team_timeslots: {
        Row: {
          created_at: string | null
          id: string
          match_date: string
          team_id: string | null
          timeslot: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_date: string
          team_id?: string | null
          timeslot?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_date?: string
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
            referencedRelation: "v_team_details"
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
            referencedRelation: "v_team_strength_of_schedule"
            referencedColumns: ["team_id"]
          },
        ]
      }
      teams: {
        Row: {
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
          wins: number
        }
        Insert: {
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
          wins?: number
        }
        Update: {
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
      v_team_details: {
        Row: {
          close_match_losses: number | null
          created_at: string | null
          division_id: string | null
          divisionname: string | null
          game_losses: number | null
          game_wins: number | null
          image_url: string | null
          logo_url: string | null
          losses: number | null
          name: string | null
          players: string[] | null
          power_score: number | null
          sos: number | null
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
    }
    Functions: {
      update_team_stats: {
        Args: {
          p_winner_id: string
          p_loser_id: string
          p_winner_game_wins?: number
          p_loser_game_wins?: number
        }
        Returns: Json
      }
    }
    Enums: {
      match_type: "winners" | "losers" | "finals"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      match_type: ["winners", "losers", "finals"],
    },
  },
} as const
