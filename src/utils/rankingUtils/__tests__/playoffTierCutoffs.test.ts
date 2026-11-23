import { describe, expect, it } from 'vitest';

import {
  COMPETITIVE_PLAYOFF_MIN_WEIGHT,
  INTERMEDIATE_PLAYOFF_MIN_WEIGHT,
} from '../playoffTierCutoffs';

describe('playoffTierCutoffs', () => {
  // Literals on purpose: changing a cut-off moves teams between tiers on the
  // Team page and in the Career competitive-win count.
  it('pins the competitive cut-off at 0.89', () => {
    expect(COMPETITIVE_PLAYOFF_MIN_WEIGHT).toBe(0.89);
  });

  it('pins the intermediate cut-off at 0.4', () => {
    expect(INTERMEDIATE_PLAYOFF_MIN_WEIGHT).toBe(0.4);
  });

  it('keeps the intermediate cut-off below the competitive cut-off', () => {
    expect(INTERMEDIATE_PLAYOFF_MIN_WEIGHT).toBeLessThan(COMPETITIVE_PLAYOFF_MIN_WEIGHT);
  });
});
