export interface WeeklyUpset {
  winnerId: string;
  winnerName: string;
  winnerLogoUrl?: string;
  /** Season power score, 0–100. Shown, not used to qualify the upset. */
  winnerPowerScore: number;
  loserId: string;
  loserName: string;
  loserLogoUrl?: string;
  loserPowerScore: number;
  /** loserPowerScore - winnerPowerScore on 0–100 scale. Display only. */
  powerScoreGap: number;
  /**
   * The winner's modelled chance of winning, 0–1. This is what qualifies the
   * match as an upset: at or below UPSET_THRESHOLD, the same rule and the same
   * model the schedule page's UpsetTag uses.
   *
   * Run after the fact it reads today's stats, which already include this win,
   * so it is "probability as of now" rather than strictly pre-match.
   */
  winnerProbability: number;
  /** e.g. "21–15" */
  matchResult: string;
  /** null for playoff upsets, which do not belong to a calendar week. */
  weekNumber: number | null;
}

export interface TeamStreakInfo {
  teamId: string;
  teamName: string;
  logoUrl?: string;
  division: string;
  streak: string;
  streakCount: number;
}

/**
 * Which phase of the season the recap is describing. Playoff games have no date
 * to slot into a calendar week, so the recap stops counting weeks once the
 * season's bracket has produced a result.
 */
export type RecapMode = 'regular' | 'playoffs';

export interface WeeklyRecapData {
  weekNumber: number | null;
  mode: RecapMode;
  upsets: WeeklyUpset[];
  hotStreaks: TeamStreakInfo[];
  hasData: boolean;
}

/** Minimum consecutive wins to appear in Hot Streaks section */
export const MIN_STREAK_COUNT = 3;
