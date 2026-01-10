export type TrendDirection = 'up' | 'down';

export interface PowerScoreTrend {
  teamId: string;
  teamName: string;
  division: string;
  logoUrl?: string;
  currentScore: number;
  previousScore: number;
  delta: number;
  percentChange: number;
}
