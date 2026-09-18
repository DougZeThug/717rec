/**
 * Report Card grade calculation utilities
 * Converts percentile rankings into letter grades for team evaluation
 */
import { calculatePercentile } from '@/utils/percentileUtils';

export type LetterGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

export interface GradeCategory {
  label: string;
  /**
   * `null` when the grade cannot be measured — a team with no deciding third
   * game has no clutch rate. A placeholder letter would read as a result, so
   * the card shows a dash instead, the way points per round already does. See
   * `src/utils/liveScoring/pprCalc.ts` for the same rule.
   */
  grade: LetterGrade | null;
  percentile: number | null;
  description: string;
}

export interface TeamGrades {
  overall: GradeCategory;
  offense: GradeCategory;
  clutch: GradeCategory;
  schedule: GradeCategory;
  consistency: GradeCategory;
  games: GradeCategory;
  gpa: number;
}

/**
 * Convert a percentile (0-100) into a letter grade
 */
export function calculateGrade(percentile: number): LetterGrade {
  if (percentile >= 95) return 'A+';
  if (percentile >= 90) return 'A';
  if (percentile >= 85) return 'A-';
  if (percentile >= 80) return 'B+';
  if (percentile >= 70) return 'B';
  if (percentile >= 65) return 'B-';
  if (percentile >= 60) return 'C+';
  if (percentile >= 50) return 'C';
  if (percentile >= 40) return 'C-';
  if (percentile >= 25) return 'D';
  return 'F';
}

/**
 * Map of grade to GPA value for calculating overall GPA
 */
const GRADE_GPA: Record<LetterGrade, number> = {
  'A+': 4.0,
  A: 4.0,
  'A-': 3.7,
  'B+': 3.3,
  B: 3.0,
  'B-': 2.7,
  'C+': 2.3,
  C: 2.0,
  'C-': 1.7,
  D: 1.0,
  F: 0.0,
};

/**
 * Get Tailwind color classes for a letter grade
 */
export function getGradeColor(grade: LetterGrade): string {
  if (grade.startsWith('A')) return 'text-emerald-600 dark:text-emerald-400';
  if (grade.startsWith('B')) return 'text-blue-600 dark:text-blue-400';
  if (grade.startsWith('C')) return 'text-amber-600 dark:text-amber-400';
  if (grade === 'D') return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Get background color classes for a letter grade card
 */
export function getGradeBgColor(grade: LetterGrade): string {
  if (grade.startsWith('A'))
    return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
  if (grade.startsWith('B'))
    return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
  if (grade.startsWith('C'))
    return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
  if (grade === 'D')
    return 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800';
  return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
}

/**
 * Get hex color for radar chart fill based on grade
 */
export function getGradeChartColor(grade: LetterGrade): string {
  if (grade.startsWith('A')) return '#10b981';
  if (grade.startsWith('B')) return '#3b82f6';
  if (grade.startsWith('C')) return '#f59e0b';
  if (grade === 'D') return '#f97316';
  return '#ef4444';
}

/**
 * Calculate weighted GPA from an array of grades with weights.
 *
 * A grade of `null` is not measurable, so it is left out of both the total and
 * the divisor — it neither helps nor hurts. Counting it as an F, or as a
 * neutral C, would both be inventing a result.
 */
export function calculateGPA(grades: { grade: LetterGrade | null; weight: number }[]): number {
  const measured = grades.filter(
    (g): g is { grade: LetterGrade; weight: number } => g.grade !== null
  );
  if (measured.length === 0) return 0;
  const totalWeight = measured.reduce((sum, g) => sum + g.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedTotal = measured.reduce((sum, g) => sum + GRADE_GPA[g.grade] * g.weight, 0);
  return Math.round((weightedTotal / totalWeight) * 100) / 100;
}

/**
 * The six categories and the weight each carries in the GPA.
 *
 * Lives here rather than in a hook so services can read it too: the weekly
 * recap grades a frozen week through the same rules
 * (`services/recapEditions/gradeTeamsForWeek.ts`). `useTeamReportCard`
 * re-exports it so its existing importers are unaffected.
 *
 * One copy on purpose. The card, the leaderboard and the weekly rankings all
 * show grades for the same teams, so a second copy of these numbers is a way
 * for them to disagree — which is what B-36 already was, for the populations.
 */
export const GRADE_WEIGHTS = {
  overall: 3,
  consistency: 2,
  games: 1.5,
  offense: 1,
  clutch: 1,
  schedule: 1,
} as const;

/**
 * Build one graded category from a value ranked against a population.
 *
 * `null` means the category cannot be measured for this team — a team with no
 * deciding third game has no clutch rate — and the card shows a dash rather
 * than a letter. An empty population means the same: there is nothing to rank
 * against, so there is no grade to give.
 */
export const gradeCategoryAgainst = (
  label: string,
  description: string,
  value: number | null,
  population: number[]
): GradeCategory => {
  if (value === null || population.length === 0) {
    return { label, grade: null, percentile: null, description };
  }
  const { percentile } = calculatePercentile(value, population, true);
  return { label, grade: calculateGrade(percentile), percentile, description };
};

/**
 * Just the letter, for callers with no card to label — the GPA leaderboard and
 * the weekly rankings. Defined through `gradeCategoryAgainst` so the two can
 * never grade the same value differently.
 */
export const gradeAgainst = (value: number | null, population: number[]): LetterGrade | null =>
  gradeCategoryAgainst('', '', value, population).grade;
