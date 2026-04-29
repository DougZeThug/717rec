import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
  validationLog: vi.fn(),
}));

import { validateGameWins, validateMatchResult, validateMatchScores } from '../matchValidation';

describe('matchValidation helpers', () => {
  it('validates score and game-win rules', () => {
    expect(validateMatchScores(1, 0)).toBe(true);
    expect(validateMatchScores(1, 1)).toBe(false);

    expect(validateGameWins(0, 0)).toBe(true);
    expect(validateGameWins(2, 2)).toBe(false);
    expect(validateGameWins(-1, 0)).toBe(false);

    expect(validateMatchResult(1, 0, 2, 1)).toEqual({ isValid: true });
    expect(validateMatchResult(1, 0, 1, 2)).toEqual(expect.objectContaining({ isValid: false }));
  });
});
