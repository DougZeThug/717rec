import { describe, expect, it } from 'vitest';

import * as DualBlock from '../index';

describe('dualBlock/index (smoke test)', () => {
  it('module is importable and defined', () => {
    expect(DualBlock).toBeDefined();
  });

  it('calculateDualBlockMetrics is exported as a function', () => {
    expect(typeof DualBlock.calculateDualBlockMetrics).toBe('function');
  });

  it('findTeamsWithSameOpponent is exported as a function', () => {
    expect(typeof DualBlock.findTeamsWithSameOpponent).toBe('function');
  });

  it('generateDualBlockPairings is exported as a function', () => {
    expect(typeof DualBlock.generateDualBlockPairings).toBe('function');
  });

  it('calculateOverallQualityScore is exported as a function', () => {
    expect(typeof DualBlock.calculateOverallQualityScore).toBe('function');
  });

  it('balanceTeamsBetweenBlocks is exported as a function', () => {
    expect(typeof DualBlock.balanceTeamsBetweenBlocks).toBe('function');
  });

  it('validateDualBlockSchedule is exported as a function', () => {
    expect(typeof DualBlock.validateDualBlockSchedule).toBe('function');
  });
});
