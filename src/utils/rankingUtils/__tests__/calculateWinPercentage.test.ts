import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({ teamLog: vi.fn() }));

import { calculateWinPercentage } from '../calculateWinPercentage';

describe('calculateWinPercentage', () => {
  it('calculates win percentage for a typical record', () => {
    expect(calculateWinPercentage(5, 3)).toBeCloseTo(5 / 8);
  });

  it('returns 0 when no games played (0/0 → no division by zero)', () => {
    expect(calculateWinPercentage(0, 0)).toBe(0);
  });

  it('returns 1 when all wins', () => {
    expect(calculateWinPercentage(7, 0)).toBe(1);
  });

  it('returns 0 when all losses', () => {
    expect(calculateWinPercentage(0, 5)).toBe(0);
  });

  it('handles string inputs via parseInt coercion', () => {
    expect(calculateWinPercentage('6' as unknown as number, '2' as unknown as number)).toBeCloseTo(
      0.75
    );
  });
});
