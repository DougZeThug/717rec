import { describe, expect, it } from 'vitest';

import {
  AMBIGUOUS_SCORES,
  getAmbiguousOptions,
  getBagBreakdown,
  isAmbiguousScore,
  validateBreakdown,
} from '../bagBreakdown';
import { VALID_ROUND_SCORES } from '../scoring';

describe('isAmbiguousScore', () => {
  it('flags exactly 3, 4 and 6 as ambiguous', () => {
    for (const score of VALID_ROUND_SCORES) {
      expect(isAmbiguousScore(score)).toBe((AMBIGUOUS_SCORES as readonly number[]).includes(score));
    }
  });

  it('is false for invalid scores', () => {
    expect(isAmbiguousScore(11)).toBe(false);
    expect(isAmbiguousScore(-1)).toBe(false);
  });
});

describe('getAmbiguousOptions', () => {
  it('offers the two bags-in counts for each ambiguous score', () => {
    expect(getAmbiguousOptions(3)).toEqual([0, 1]);
    expect(getAmbiguousOptions(4)).toEqual([0, 1]);
    expect(getAmbiguousOptions(6)).toEqual([1, 2]);
  });

  it('returns an empty list for invalid scores', () => {
    expect(getAmbiguousOptions(11)).toEqual([]);
  });
});

describe('getBagBreakdown', () => {
  it('resolves unambiguous scores without a bags-in answer', () => {
    expect(getBagBreakdown(0)).toEqual({ bagsIn: 0, bagsOn: 0, bagsOff: 4 });
    expect(getBagBreakdown(5)).toEqual({ bagsIn: 1, bagsOn: 2, bagsOff: 1 });
    expect(getBagBreakdown(12)).toEqual({ bagsIn: 4, bagsOn: 0, bagsOff: 0 });
  });

  it('needs a bags-in answer for ambiguous scores', () => {
    expect(getBagBreakdown(6)).toBeNull();
    expect(getBagBreakdown(6, 1)).toEqual({ bagsIn: 1, bagsOn: 3, bagsOff: 0 });
    expect(getBagBreakdown(6, 2)).toEqual({ bagsIn: 2, bagsOn: 0, bagsOff: 2 });
  });

  it('rejects impossible bags-in answers', () => {
    expect(getBagBreakdown(6, 3)).toBeNull();
    expect(getBagBreakdown(3, 2)).toBeNull();
  });

  it('rejects invalid scores', () => {
    expect(getBagBreakdown(11)).toBeNull();
    expect(getBagBreakdown(13)).toBeNull();
  });

  it('every resolvable breakdown is internally consistent', () => {
    for (const score of VALID_ROUND_SCORES) {
      for (const bagsIn of isAmbiguousScore(score) ? getAmbiguousOptions(score) : [undefined]) {
        const breakdown = getBagBreakdown(score, bagsIn);
        expect(breakdown).not.toBeNull();
        expect(validateBreakdown(score, breakdown!)).toBe(true);
      }
    }
  });
});

describe('validateBreakdown', () => {
  it('rejects breakdowns that do not use exactly 4 bags', () => {
    expect(validateBreakdown(3, { bagsIn: 1, bagsOn: 0, bagsOff: 2 })).toBe(false);
  });

  it('rejects breakdowns whose points do not match the score', () => {
    expect(validateBreakdown(6, { bagsIn: 1, bagsOn: 1, bagsOff: 2 })).toBe(false);
  });

  it('rejects negative or non-integer counts', () => {
    expect(validateBreakdown(3, { bagsIn: -1, bagsOn: 6, bagsOff: -1 })).toBe(false);
    expect(validateBreakdown(3, { bagsIn: 0.5, bagsOn: 1.5, bagsOff: 2 })).toBe(false);
  });
});
