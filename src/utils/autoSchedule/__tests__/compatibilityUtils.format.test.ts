import { describe, expect, it, vi } from 'vitest';

import { formatCompatibilityScore } from '../compatibilityUtils';

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
}));

describe('formatCompatibilityScore', () => {
  describe('from 5 up: one decimal, as it always was', () => {
    it.each([
      [5, '5.0'],
      [10, '10.0'],
      [8, '8.0'],
      [9.5, '9.5'],
      [9.98828125, '10.0'],
      [9.99609375, '10.0'],
      [7.25, '7.3'],
    ])('reads %d as %s', (score, text) => {
      expect(formatCompatibilityScore(score)).toBe(text);
      expect(formatCompatibilityScore(score)).toBe(score.toFixed(1));
    });
  });

  describe('under 5: cut to two decimals, never rounded up to 5.0', () => {
    it.each([
      [0, '0.0'],
      [4.6, '4.6'],
      [4.5, '4.5'],
      [4.98828125, '4.98'],
      [4.99609375, '4.99'],
      [4.9921875, '4.99'],
      [4.953125, '4.95'],
      [4.8203125, '4.82'],
      [4.75, '4.75'],
      [3, '3.0'],
      [0.5, '0.5'],
    ])('reads %d as %s', (score, text) => {
      expect(formatCompatibilityScore(score)).toBe(text);
    });

    it('does not let a float error cut 4.6 down to 4.59', () => {
      // 4.6 * 100 is 459.99999999999994 in floating point.
      expect(4.6 * 100).toBeLessThan(460);
      expect(formatCompatibilityScore(4.6)).toBe('4.6');
      expect(formatCompatibilityScore(4.35)).toBe('4.35');
    });

    it('does not let a score a hair under 5 reach 5.0 or 5.00', () => {
      expect(formatCompatibilityScore(4.9999999999)).toBe('4.99');
      expect(formatCompatibilityScore(5 - Number.EPSILON * 8)).toBe('4.99');
    });

    it('reads every 1/256 step under 5 as its value cut to two decimals, and never as 5', () => {
      // 1279 / 256 is 4.99609375, the highest ON score under 5.
      for (let step = 0; step < 5 * 256; step++) {
        const score = step / 256;
        const text = formatCompatibilityScore(score);

        expect(text).toMatch(/^\d\.\d{1,2}$/);
        expect(text).not.toMatch(/^5\./);
        // Cut, not rounded: the text never reads higher than the score, and is within 0.01 of it.
        expect(Number(text)).toBeLessThanOrEqual(score);
        expect(score - Number(text)).toBeLessThan(0.01);
      }
    });
  });
});
