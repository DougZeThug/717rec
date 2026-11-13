import type { TeamStreakInfo, WeeklyUpset } from '@/types/weeklyRecap';

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
