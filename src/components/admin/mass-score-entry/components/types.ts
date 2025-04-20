
export interface ScoreOption {
  team1Score: number;
  team2Score: number;
  label: string;
}

export const SCORE_OPTIONS: ScoreOption[] = [
  { team1Score: 2, team2Score: 0, label: "2–0" },
  { team1Score: 2, team2Score: 1, label: "2–1" },
  { team1Score: 0, team2Score: 2, label: "0–2" },
  { team1Score: 1, team2Score: 2, label: "1–2" },
];
