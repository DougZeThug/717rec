import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { useScoreValidation } from '../useScoreValidation';

describe('useScoreValidation', () => {
  it('covers score and match validation failures', () => {
    const { result } = renderHook(() => useScoreValidation());

    expect(result.current.validateScores(2, 0)).toBe(false);
    expect(result.current.validateScores(1, 1)).toBe(false);

    expect(result.current.validateGameWins(-1, 2)).toBe(false);
    expect(result.current.validateGameWins(2, 2)).toBe(false);

    expect(
      result.current.validateMatch({
        team1Score: 1,
        team2Score: 0,
        team1_game_wins: 1,
        team2_game_wins: 0,
      })
    ).toBe(false);

    expect(
      result.current.validateMatch({
        team1Score: 1,
        team2Score: 0,
        team1_game_wins: 1,
        team2_game_wins: 2,
      })
    ).toBe(false);

    act(() => {
      result.current.setValidationError('m1', 'bad score');
    });
    expect(result.current.validationErrors).toEqual({ m1: 'bad score' });

    act(() => {
      result.current.clearValidationError('m1');
    });
    expect(result.current.validationErrors).toEqual({});
  });
});
