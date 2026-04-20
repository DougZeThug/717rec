import { describe, expect, it } from 'vitest';

import {
  calculateAllPercentiles,
  calculatePercentile,
  formatOrdinal,
  formatPercentileText,
  getPercentileTier,
} from '../percentileUtils';

describe('calculatePercentile', () => {
  it('returns zeros for empty array', () => {
    const result = calculatePercentile(50, []);
    expect(result).toEqual({ value: 50, percentile: 0, rank: 0, total: 0 });
  });

  it('gives 100th percentile to the sole top value', () => {
    const result = calculatePercentile(100, [50, 75, 100]);
    expect(result.percentile).toBe(100);
    expect(result.rank).toBe(1);
  });

  it('gives 0th percentile to the bottom value', () => {
    const result = calculatePercentile(10, [10, 50, 90]);
    expect(result.percentile).toBe(0);
    expect(result.rank).toBe(3);
  });

  it('gives 50th percentile to middle value in 3-value set', () => {
    const result = calculatePercentile(50, [10, 50, 90]);
    expect(result.percentile).toBe(50);
    expect(result.rank).toBe(2);
  });

  it('reverses ranking when higherIsBetter is false', () => {
    // Lower value = better, so 10 should rank 1st and have highest percentile
    const result = calculatePercentile(10, [10, 50, 90], false);
    expect(result.rank).toBe(1);
    expect(result.percentile).toBe(100);
  });

  it('single element gets percentile 100', () => {
    const result = calculatePercentile(42, [42]);
    expect(result.percentile).toBe(100);
    expect(result.total).toBe(1);
  });
});

describe('formatOrdinal', () => {
  it('formats 1 as 1st', () => expect(formatOrdinal(1)).toBe('1st'));
  it('formats 2 as 2nd', () => expect(formatOrdinal(2)).toBe('2nd'));
  it('formats 3 as 3rd', () => expect(formatOrdinal(3)).toBe('3rd'));
  it('formats 4 as 4th', () => expect(formatOrdinal(4)).toBe('4th'));
  it('formats 11 as 11th', () => expect(formatOrdinal(11)).toBe('11th'));
  it('formats 12 as 12th', () => expect(formatOrdinal(12)).toBe('12th'));
  it('formats 13 as 13th', () => expect(formatOrdinal(13)).toBe('13th'));
  it('formats 21 as 21st', () => expect(formatOrdinal(21)).toBe('21st'));
  it('formats 22 as 22nd', () => expect(formatOrdinal(22)).toBe('22nd'));
});

describe('formatPercentileText', () => {
  it('shows Top N% for percentile >= 90', () => {
    expect(formatPercentileText(95)).toBe('Top 5%');
    expect(formatPercentileText(90)).toBe('Top 10%');
  });

  it('shows Nth for percentile < 90', () => {
    expect(formatPercentileText(75)).toBe('75th');
    expect(formatPercentileText(50)).toBe('50th');
    expect(formatPercentileText(20)).toBe('20th');
  });
});

describe('getPercentileTier', () => {
  it('returns elite for >= 90', () => expect(getPercentileTier(90)).toBe('elite'));
  it('returns strong for >= 75', () => expect(getPercentileTier(75)).toBe('strong'));
  it('returns average for >= 50', () => expect(getPercentileTier(50)).toBe('average'));
  it('returns below for >= 25', () => expect(getPercentileTier(25)).toBe('below'));
  it('returns weak for < 25', () => expect(getPercentileTier(24)).toBe('weak'));
  it('returns weak for 0', () => expect(getPercentileTier(0)).toBe('weak'));
});

describe('calculateAllPercentiles', () => {
  it('returns a Map with correct percentile for each team', () => {
    const teams = [
      { id: 'a', value: 90 },
      { id: 'b', value: 50 },
      { id: 'c', value: 10 },
    ];
    const map = calculateAllPercentiles(teams);
    expect(map.get('a')?.rank).toBe(1);
    expect(map.get('c')?.rank).toBe(3);
    expect(map.size).toBe(3);
  });

  it('returns empty Map for empty input', () => {
    expect(calculateAllPercentiles([])).toEqual(new Map());
  });
});
