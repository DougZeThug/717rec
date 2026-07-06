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

  describe('validateMatch (full completed-match consistency)', () => {
    it('accepts team1 winning 2-1 in games with a 1-0 match score', () => {
      const { validateMatch } = setup();
      expect(
        validateMatch({ team1Score: 1, team2Score: 0, team1_game_wins: 2, team2_game_wins: 1 })
      ).toBe(true);
    });

    it('accepts team2 winning a 2-0 sweep with a 0-1 match score', () => {
      const { validateMatch } = setup();
      expect(
        validateMatch({ team1Score: 0, team2Score: 1, team1_game_wins: 0, team2_game_wins: 2 })
      ).toBe(true);
    });

    it('rejects a tied match score', () => {
      const { validateMatch } = setup();
      expect(
        validateMatch({ team1Score: 1, team2Score: 1, team1_game_wins: 2, team2_game_wins: 1 })
      ).toBe(false);
    });

    it('rejects game win totals outside 2-3 (best-of-3 assumption)', () => {
      const { validateMatch } = setup();
      expect(
        validateMatch({ team1Score: 1, team2Score: 0, team1_game_wins: 3, team2_game_wins: 1 })
      ).toBe(false);
      expect(
        validateMatch({ team1Score: 1, team2Score: 0, team1_game_wins: 1, team2_game_wins: 0 })
      ).toBe(false);
    });

    it('rejects a winner whose game wins do not support the match score', () => {
      const { validateMatch } = setup();
      // team1 marked winner but team2 actually won more games
      expect(
        validateMatch({ team1Score: 1, team2Score: 0, team1_game_wins: 1, team2_game_wins: 2 })
      ).toBe(false);
      // team2 marked winner but team1 swept
      expect(
        validateMatch({ team1Score: 0, team2Score: 1, team1_game_wins: 2, team2_game_wins: 0 })
      ).toBe(false);
    });

    it('rejects non-binary match scores', () => {
      const { validateMatch } = setup();
      expect(
        validateMatch({ team1Score: 2, team2Score: 1, team1_game_wins: 2, team2_game_wins: 1 })
      ).toBe(false);
    });
  });
});
