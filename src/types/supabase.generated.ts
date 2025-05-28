export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      account_team: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          team_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          team_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_team_account_id_fkey"
            columns: ["account_id"]
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_team_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      accounts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          nickname: string | null
          profile_image: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          nickname?: string | null
          profile_image?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          nickname?: string | null
          profile_image?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      brackets: {
        Row: {
          challonge_tournament_id: string | null
          created_at: string | null
          division_id: string | null
          format: string | null
          id: string
          migrated: boolean | null
          migrated_at: string | null
          reset_match_needed: boolean | null
          state: string | null
          title: string
          wb_champion_id: string | null
        }
        Insert: {
          challonge_tournament_id?: string | null
          created_at?: string | null
          division_id?: string | null
          format?: string | null
          id?: string
          migrated?: boolean | null
          migrated_at?: string | null
          reset_match_needed?: boolean | null
          state?: string | null
          title: string
          wb_champion_id?: string | null
        }
        Update: {
          challonge_tournament_id?: string | null
          created_at?: string | null
          division_id?: string | null
          format?: string | null
          id?: string
          migrated?: boolean | null
          migrated_at?: string | null
          reset_match_needed?: boolean | null
          state?: string | null
          title?: string
          wb_champion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brackets_division_id_fkey"
            columns: ["division_id"]
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          }
        ]
      }
      divisions: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          organization_id: string | null
          season_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          organization_id?: string | null
          season_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          organization_id?: string | null
          season_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "divisions_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "divisions_season_id_fkey"
            columns: ["season_id"]
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          }
        ]
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
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          id: string
          is_edited: boolean | null
          team_id: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          }
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      playoff_matches: {
        Row: {
          best_of: number | null
          bracket_id: string | null
          created_at: string | null
          id: string
          match_type: string | null
          position: number | null
          round: number | null
          team1_game_wins: number | null
          team1_id: string | null
          team1_score: number | null
          team2_game_wins: number | null
          team2_id: string | null
          team2_score: number | null
          updated_at: string | null
          winner_id: string | null
        }
        Insert: {
          best_of?: number | null
          bracket_id?: string | null
          created_at?: string | null
          id?: string
          match_type?: string | null
          position?: number | null
          round?: number | null
          team1_game_wins?: number | null
          team1_id?: string | null
          team1_score?: number | null
          team2_game_wins?: number | null
          team2_id?: string | null
          team2_score?: number | null
          updated_at?: string | null
          winner_id?: string | null
        }
        Update: {
          best_of?: number | null
          bracket_id?: string | null
          created_at?: string | null
          id?: string
          match_type?: string | null
          position?: number | null
          round?: number | null
          team1_game_wins?: number | null
          team1_id?: string | null
          team1_score?: number | null
          team2_game_wins?: number | null
          team2_id?: string | null
          team2_score?: number | null
          updated_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playoff_matches_bracket_id_fkey"
            columns: ["bracket_id"]
            referencedRelation: "brackets"
            referencedColumns: ["id"]
          }
        ]
      }
      seasons: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          organization_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          organization_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      team_invites: {
        Row: {
          created_at: string | null
          email: string
          id: string
          team_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          team_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      teams: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          division_id: string | null
          id: string
          name: string | null
          power_score: number | null
          seed: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          division_id?: string | null
          id?: string
          name?: string | null
          power_score?: number | null
          seed?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          division_id?: string | null
          id?: string
          name?: string | null
          power_score?: number | null
          seed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_division_id_fkey"
            columns: ["division_id"]
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_message_reaction_counts: {
        Args: {
          message_id_input: string
        }
        Returns: {
          emoji: string
          count: number
          has_reacted: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type BracketDto = Database['public']['Tables']['brackets']['Row'];
export type MatchDto = Database['public']['Tables']['playoff_matches']['Row'];
