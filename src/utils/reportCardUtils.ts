/**
 * Report Card grade calculation utilities
 * Converts percentile rankings into letter grades for team evaluation
 */

export type LetterGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

export interface GradeCategory {
  label: string;
  grade: LetterGrade;
  percentile: number;
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
 * Calculate GPA from an array of grades
 */
export function calculateGPA(grades: LetterGrade[]): number {
  if (grades.length === 0) return 0;
  const total = grades.reduce((sum, grade) => sum + GRADE_GPA[grade], 0);
  return Math.round((total / grades.length) * 100) / 100;
}

