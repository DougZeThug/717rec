export interface PowerScoreSnapshot {
  id: string;
  team_id: string;
  season_id: string;
  week_number: number;
  snapshot_date: string;
  power_score: number | null;
  sos: number | null;
  match_wins: number;
  match_losses: number;
  game_wins: number;
  game_losses: number;
  division_id: string | null;
  created_at: string;
}

export interface WeeklyPowerScoreTrend {
  teamId: string;
  teamName: string;
  division: string;
  logoUrl?: string;
  currentScore: number;
  previousScore: number;
  delta: number;
  percentChange: number;
  currentWeek: number;
  previousWeek: number;
}
