import { describe, expect, it } from 'vitest';

import {
  differentialPerRound,
  formatPercent,
  formatRatio,
  percentage,
  pointsPerRound,
} from '../pprCalc';

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

describe('percentage', () => {
  it('returns part/whole as 0-100', () => {
    expect(percentage(2, 4)).toBe(50);
    expect(percentage(4, 4)).toBe(100);
    expect(percentage(30, 80)).toBeCloseTo(37.5);
  });

  it('is null (never a fake 0%) when the denominator is 0 or negative', () => {
    expect(percentage(0, 0)).toBeNull();
    expect(percentage(3, -1)).toBeNull();
  });

  it('a true 0% is still reported when data exists', () => {
    expect(percentage(0, 8)).toBe(0);
  });
});

describe('formatPercent', () => {
  it('rounds to a whole percent', () => {
    expect(formatPercent(37.5)).toBe('38%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(100)).toBe('100%');
  });

  it('renders a dash for null (unknown, not 0%)', () => {
    expect(formatPercent(null)).toBe('–');
  });
});
