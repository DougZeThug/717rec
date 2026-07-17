import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useScoreValidation } from '../useScoreValidation';

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const setup = () => renderHook(() => useScoreValidation()).result.current;

describe('useScoreValidation', () => {
  describe('validateScore (binary match scores)', () => {
    it('accepts a 1-0 result and a 0-1 result', () => {
      const { validateScore } = setup();
      expect(validateScore(1, 0)).toEqual({ isValid: true });
      expect(validateScore(0, 1)).toEqual({ isValid: true });
    });

    it('rejects NaN scores', () => {
      const { validateScore } = setup();
      const result = validateScore(NaN, 1);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Scores must be valid numbers');
    });

    it('rejects non-binary scores (e.g. game wins entered as match score)', () => {
      const { validateScore } = setup();
      const result = validateScore(2, 1);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Match scores must be either 0 (loss) or 1 (win)');
    });

    it('rejects ties — exactly one team must win', () => {
      const { validateScore } = setup();
      expect(validateScore(1, 1)).toEqual({
        isValid: false,
        errorMessage: 'One team must win the match',
      });
      expect(validateScore(0, 0).isValid).toBe(false);
    });
  });
});
