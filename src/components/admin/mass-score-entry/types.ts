
import { Match, Team } from "@/types";

// Extended Match interface for the component's internal use
export interface MatchWithTeams extends Match {
  team1?: Team;
  team2?: Team;
  isEdited?: boolean;
  isValid?: boolean;
}

export interface FilterState {
  date?: Date;
  bracketId?: string;
}
