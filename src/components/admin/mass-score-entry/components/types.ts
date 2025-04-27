
export interface ScoreOption {
  team1Score: number;
  team2Score: number;
  team1GameWins: number;
  team2GameWins: number;
  label: string;
}

export const SCORE_OPTIONS: ScoreOption[] = [
  { team1Score: 1, team2Score: 0, team1GameWins: 2, team2GameWins: 0, label: "2–0" },
  { team1Score: 1, team2Score: 0, team1GameWins: 2, team2GameWins: 1, label: "2–1" },
  { team1Score: 0, team2Score: 1, team1GameWins: 1, team2GameWins: 2, label: "1–2" },
  { team1Score: 0, team2Score: 1, team1GameWins: 0, team2GameWins: 2, label: "0–2" },
];
