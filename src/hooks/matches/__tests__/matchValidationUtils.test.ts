import { describe, expect, it, vi } from 'vitest';

import { validateGameScore, validateGameScoreWithMetadata } from '../utils/matchValidationUtils';

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
  validationLog: vi.fn(),
  warnLog: vi.fn(),
}));

describe('validateGameScore', () => {
  describe('input sanity checks', () => {
    it('rejects NaN inputs', () => {
      const result = validateGameScore(NaN, 1, 3);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Invalid numeric values for score validation');
    });

    it('rejects non-numeric strings coerced to NaN', () => {
      const result = validateGameScore('abc' as unknown as number, 1, 3);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Invalid numeric values for score validation');
    });

    it('rejects a non-positive bestOf', () => {
      expect(validateGameScore(1, 0, 0)).toEqual({
        isValid: false,
        errorMessage: 'Invalid match format (bestOf: 0)',
      });
      expect(validateGameScore(1, 0, -3).isValid).toBe(false);
    });

    it('coerces numeric strings before validating', () => {
      const result = validateGameScore(
        '2' as unknown as number,
        '1' as unknown as number,
        '3' as unknown as number
      );
      expect(result.isValid).toBe(true);
    });
  });

  describe('best of 3', () => {
    it('accepts a 2-0 sweep', () => {
      expect(validateGameScore(2, 0, 3)).toEqual({ isValid: true });
    });

    it('accepts a 2-1 win', () => {
      expect(validateGameScore(2, 1, 3)).toEqual({ isValid: true });
    });

    it('accepts a 1-2 win for team2', () => {
      expect(validateGameScore(1, 2, 3)).toEqual({ isValid: true });
    });

    it('allows 0-0 as a temporary in-progress state', () => {
      expect(validateGameScore(0, 0, 3)).toEqual({ isValid: true });
    });

    it('rejects a score where both teams reached the win threshold', () => {
      const result = validateGameScore(2, 2, 3);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe("Invalid score: both teams can't win in a best of 3");
    });

    it('rejects total games exceeding the format maximum', () => {
      const result = validateGameScore(3, 1, 3);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('total games (4) exceeds maximum (3)');
    });

    it('rejects an incomplete score where neither team has enough wins', () => {
      const result = validateGameScore(1, 0, 3);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe(
        'Incomplete score: a team must win at least 2 games in a best of 3'
      );
    });
  });

  describe('best of 5', () => {
    it('accepts 3-0, 3-1 and 3-2 wins', () => {
      expect(validateGameScore(3, 0, 5).isValid).toBe(true);
      expect(validateGameScore(3, 1, 5).isValid).toBe(true);
      expect(validateGameScore(3, 2, 5).isValid).toBe(true);
      expect(validateGameScore(2, 3, 5).isValid).toBe(true);
    });

    it('rejects a winner with more than the exact games needed (4-1)', () => {
      const result = validateGameScore(4, 1, 5);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Invalid score combination for best of 5');
    });

    it('rejects an incomplete 2-2 score', () => {
      const result = validateGameScore(2, 2, 5);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('a team must win at least 3 games');
    });
  });

  describe('best of 1', () => {
    it('accepts 1-0 and 0-1', () => {
      expect(validateGameScore(1, 0, 1).isValid).toBe(true);
      expect(validateGameScore(0, 1, 1).isValid).toBe(true);
    });

    it('rejects 1-1', () => {
      expect(validateGameScore(1, 1, 1).isValid).toBe(false);
    });
  });
});

describe('validateGameScoreWithMetadata', () => {
  it('returns the same result as validateGameScore for a valid score', () => {
    const result = validateGameScoreWithMetadata(2, 1, 3, 'match-1', '2026-01-01');
    expect(result).toEqual({ isValid: true });
  });

  it('returns the same failure result including the error message', () => {
    const result = validateGameScoreWithMetadata(2, 2, 3, 'match-1');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe("Invalid score: both teams can't win in a best of 3");
  });

  it('works without optional match metadata', () => {
    expect(validateGameScoreWithMetadata(2, 0, 3)).toEqual({ isValid: true });
  });
});
