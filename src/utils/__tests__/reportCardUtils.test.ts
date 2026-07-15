import { describe, expect, it } from 'vitest';

import {
  calculateGPA,
  calculateGrade,
  getGradeBgColor,
  getGradeChartColor,
  getGradeColor,
  type LetterGrade,
} from '../reportCardUtils';

describe('reportCardUtils', () => {
  describe('calculateGrade', () => {
    it.each([
      [100, 'A+'],
      [95, 'A+'],
      [94, 'A'],
      [90, 'A'],
      [89, 'A-'],
      [85, 'A-'],
      [80, 'B+'],
      [70, 'B'],
      [65, 'B-'],
      [60, 'C+'],
      [50, 'C'],
      [40, 'C-'],
      [25, 'D'],
      [24, 'F'],
      [0, 'F'],
    ])('maps percentile %i to grade %s', (pct, expected) => {
      expect(calculateGrade(pct)).toBe(expected);
    });
  });

  describe('color helpers', () => {
    const cases: LetterGrade[] = ['A+', 'B', 'C-', 'D', 'F'];
    it.each(cases)('returns non-empty color strings for %s', (grade) => {
      expect(getGradeColor(grade)).toMatch(/text-/);
      expect(getGradeBgColor(grade)).toMatch(/bg-/);
      expect(getGradeChartColor(grade)).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('distinguishes A / B / C / D / F chart colors', () => {
      const colors = new Set(cases.map(getGradeChartColor));
      expect(colors.size).toBe(cases.length);
    });
  });

  describe('calculateGPA', () => {
    it('returns 0 for empty grades', () => {
      expect(calculateGPA([])).toBe(0);
    });

    it('returns 0 when all weights are 0', () => {
      expect(calculateGPA([{ grade: 'A', weight: 0 }])).toBe(0);
    });

    it('computes weighted average and rounds to 2 decimals', () => {
      const gpa = calculateGPA([
        { grade: 'A', weight: 1 }, // 4.0
        { grade: 'C', weight: 1 }, // 2.0
      ]);
      expect(gpa).toBeCloseTo(3.0, 2);
    });

    it('respects unequal weights', () => {
      const gpa = calculateGPA([
        { grade: 'A', weight: 3 }, // 4.0
        { grade: 'F', weight: 1 }, // 0.0
      ]);
      // (4*3 + 0)/4 = 3.00
      expect(gpa).toBe(3.0);
    });
  });
});
