import { describe, expect, it } from 'vitest';

import { getSosColor, getSweepRateColor } from '../colors';

describe('src/utils/colors.ts', () => {
  it.each([
    { label: 'null value', input: null, expected: 'text-muted-foreground' },
    { label: 'undefined value', input: undefined, expected: 'text-muted-foreground' },
    { label: 'very hard boundary', input: 0.875, expected: 'text-red-700 dark:text-red-500' },
    { label: 'hard boundary', input: 0.75, expected: 'text-red-500 dark:text-red-400' },
    { label: 'moderate boundary', input: 0.55, expected: 'text-orange-500 dark:text-orange-400' },
    { label: 'easy bucket', input: 0.54, expected: 'text-green-600 dark:text-green-500' },
  ])('getSosColor: $label', ({ input, expected }) => {
    expect(getSosColor(input)).toBe(expected);
  });

  it.each([
    { label: 'null value', input: null, expected: 'text-muted-foreground' },
    { label: 'undefined value', input: undefined, expected: 'text-muted-foreground' },
    { label: 'elite boundary', input: 70, expected: 'text-yellow-600 dark:text-yellow-500' },
    { label: 'excellent boundary', input: 55, expected: 'text-green-600 dark:text-green-500' },
    { label: 'good boundary', input: 40, expected: 'text-blue-600 dark:text-blue-500' },
    { label: 'average boundary', input: 25, expected: 'text-orange-500 dark:text-orange-400' },
    { label: 'below average fallback', input: 24, expected: 'text-red-600 dark:text-red-500' },
  ])('getSweepRateColor: $label', ({ input, expected }) => {
    expect(getSweepRateColor(input)).toBe(expected);
  });
});
