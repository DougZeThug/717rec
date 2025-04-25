
export interface ChartDataItem {
  name: string;
  displayName?: string;
  wins: number;
  losses: number;
  winPercentage?: number;
  win_percentage?: number;
  calculatedWinPct?: number;
  powerScore?: number;
  imageUrl?: string | null;
  logoUrl?: string | null;
  id: string;
}

export interface PowerScoreDataItem {
  name: string;
  powerScore: number;
  id?: string;
}
