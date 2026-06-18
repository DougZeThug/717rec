import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
}));

import { validateMatchScores } from '../matchValidation';

describe('matchValidation helpers', () => {
  it('validates score and game-win rules', () => {
    expect(validateMatchScores(1, 0)).toBe(true);
    expect(validateMatchScores(1, 1)).toBe(false);
  });
});
