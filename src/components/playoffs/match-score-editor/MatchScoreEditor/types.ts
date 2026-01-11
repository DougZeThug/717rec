import type { PlayoffMatch, Team } from '@/types';

export interface MatchScoreEditorProps {
  match: PlayoffMatch;
  teams: Team[];
  onSave: (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: GameData[],
    team1GameWins: number,
    team2GameWins: number,
    refetchBrackets: () => Promise<any>
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
