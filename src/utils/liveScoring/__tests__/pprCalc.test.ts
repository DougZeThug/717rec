import { describe, expect, it } from 'vitest';

import { differentialPerRound, formatRatio, pointsPerRound } from '../pprCalc';

describe('pointsPerRound', () => {
  it('divides points by rounds thrown', () => {
    expect(pointsPerRound(29, 4)).toBeCloseTo(7.25);
    expect(pointsPerRound(0, 5)).toBe(0);
  });

  it('is null (not 0 or NaN) when no rounds were thrown', () => {
    expect(pointsPerRound(0, 0)).toBeNull();
    expect(pointsPerRound(10, -1)).toBeNull();
  });
});

describe('differentialPerRound', () => {
  it('is PPR minus opponent PPR over the same rounds', () => {
    expect(differentialPerRound(30, 20, 5)).toBeCloseTo(2);
    expect(differentialPerRound(10, 25, 5)).toBeCloseTo(-3);
  });

  it('is null when no rounds were thrown', () => {
    expect(differentialPerRound(10, 5, 0)).toBeNull();
  });
});

describe('formatRatio', () => {
  it('formats numbers to 2 decimals by default', () => {
    expect(formatRatio(7.256)).toBe('7.26');
    expect(formatRatio(2, 1)).toBe('2.0');
  });

  it('renders a dash for null', () => {
    expect(formatRatio(null)).toBe('–');
  });
});
