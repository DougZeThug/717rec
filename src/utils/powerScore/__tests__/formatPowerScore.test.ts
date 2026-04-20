import { describe, expect, it } from 'vitest';

import { formatPowerScore } from '../formatPowerScore';

describe('formatPowerScore', () => {
  it('returns em dash for undefined', () => {
    expect(formatPowerScore(undefined)).toBe('—');
  });

  it('formats 0 as "0.0"', () => {
    expect(formatPowerScore(0)).toBe('0.0');
  });

  it('formats 100 as "100.0"', () => {
    expect(formatPowerScore(100)).toBe('100.0');
  });

  it('rounds to 1 decimal place', () => {
    expect(formatPowerScore(65.56)).toBe('65.6');
    expect(formatPowerScore(65.54)).toBe('65.5');
  });

  it('formats a typical mid-range score', () => {
    expect(formatPowerScore(72.3)).toBe('72.3');
  });
});
