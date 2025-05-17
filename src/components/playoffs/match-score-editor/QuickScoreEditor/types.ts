
import { PlayoffMatch, Team } from "@/types";

export interface QuickScoreEditorProps {
  match: PlayoffMatch;
  teams: Team[];
  onSave: (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number
  ) => void;
  onCancel: () => void;
}

export interface ScoreOption {
  team1GameWins: number;
  team2GameWins: number;
  label: string;
  winner: "team1" | "team2";
}
