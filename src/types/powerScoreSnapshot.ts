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

/**
 * How the comparison was reached. A recap edition is frozen, so a missing
 * snapshot must be recorded rather than quietly papered over — comparing week 7
 * against week 5 while labelling it "this week" would publish a falsehood
 * permanently.
 */
export type TrendBasis =
  /** Week N compared against week N-1, as intended. */
  | 'compared'
  /** Week N-1 has no snapshot; compared against the nearest earlier week. */
  | 'gap'
  /** Nothing earlier exists to compare against (week 1). */
  | 'baseline'
  /** Week N has no snapshot, or none of its rows has a power score. No movement can be reported. */
  | 'missing';
