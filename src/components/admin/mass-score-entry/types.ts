
import { Match, Team } from "@/types";

// Extended Match interface for the component's internal use
export interface MatchWithTeams extends Match {
  team1?: Team;
  team2?: Team;
  team1Id: string;
  team2Id: string;
  team1Score?: number | null;
  team2Score?: number | null;
  team1_game_wins?: number | null;
  team2_game_wins?: number | null;
  date?: string;
  location?: string;
  iscompleted?: boolean;
  id: string;
  isEdited?: boolean;
  isValid?: boolean;
  winnerId?: string | null;
  loserId?: string | null;
  // Removed properties that don't exist in matches table:
  // round_number, position, bracket_id
}

export interface FilterState {
  date?: Date;
  bracketId?: string; // Keep for UI compatibility even though not used for matches
}
