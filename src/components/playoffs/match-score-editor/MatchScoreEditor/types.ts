
import type { PlayoffMatch, Team } from "@/types";

export interface MatchScoreEditorProps {
  match: PlayoffMatch;
  teams: Team[];
  onSave: (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number
  ) => Promise<void>;
  onCancel: () => void;
}

export interface GameData {
  team1Score: number;
  team2Score: number;
}

export interface ValidationResult {
  isValid: boolean;
  errorMessage: string | null;
}
