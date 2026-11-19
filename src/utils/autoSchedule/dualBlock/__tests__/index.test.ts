import { describe, expect, it } from 'vitest';

import {
  balanceTeamsBetweenBlocks,
  calculateDualBlockMetrics,
  validateDualBlockSchedule,
} from '../index';
import { calculateOverallQualityScore } from '../qualityScoreUtils';

describe('dualBlock/index (smoke test)', () => {
  it('calculateDualBlockMetrics is exported as a function', () => {
    expect(typeof calculateDualBlockMetrics).toBe('function');
  });

  it('calculateOverallQualityScore is exported as a function', () => {
    expect(typeof calculateOverallQualityScore).toBe('function');
  });

  it('balanceTeamsBetweenBlocks is exported as a function', () => {
    expect(typeof balanceTeamsBetweenBlocks).toBe('function');
  });

  it('validateDualBlockSchedule is exported as a function', () => {
    expect(typeof validateDualBlockSchedule).toBe('function');
  });
});
