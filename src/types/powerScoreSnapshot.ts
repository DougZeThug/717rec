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
