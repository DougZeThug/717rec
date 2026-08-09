export interface WeeklyUpset {
  winnerId: string;
  winnerName: string;
  winnerLogoUrl?: string;
  winnerPowerScore: number;
  loserId: string;
  loserName: string;
  loserLogoUrl?: string;
  loserPowerScore: number;
  /** loserPowerScore - winnerPowerScore on 0–100 scale */
  powerScoreGap: number;
  /** e.g. "21–15" */
  matchResult: string;
  weekNumber: number;
}

export interface TeamStreakInfo {
  teamId: string;
  teamName: string;
  logoUrl?: string;
  division: string;
  streak: string;
  streakCount: number;
}

export interface WeeklyRecapData {
  weekNumber: number | null;
  upsets: WeeklyUpset[];
  hotStreaks: TeamStreakInfo[];
  hasData: boolean;
}

/** Minimum consecutive wins to appear in Hot Streaks section */
export const MIN_STREAK_COUNT = 3;
