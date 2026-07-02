import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useTeamStatsValidation } from '../useTeamStatsValidation';

const setup = () => renderHook(() => useTeamStatsValidation()).result.current;

describe('useTeamStatsValidation', () => {
  it('accepts a normal winner/loser stats update', () => {
    const { validateTeamStats } = setup();
    expect(validateTeamStats('winner-1', 'loser-1', 2, 1)).toEqual({ isValid: true });
  });

  it('accepts zero game wins for the loser', () => {
    const { validateTeamStats } = setup();
    expect(validateTeamStats('winner-1', 'loser-1', 2, 0)).toEqual({ isValid: true });
  });

  it('rejects a missing winner id', () => {
    const { validateTeamStats } = setup();
    const result = validateTeamStats('', 'loser-1', 2, 1);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Missing winner or loser ID for team stats update');
  });

  it('rejects a missing loser id', () => {
    const { validateTeamStats } = setup();
    expect(validateTeamStats('winner-1', '', 2, 1).isValid).toBe(false);
  });

  it('rejects negative game wins for either team', () => {
    const { validateTeamStats } = setup();
    expect(validateTeamStats('winner-1', 'loser-1', -1, 0)).toEqual({
      isValid: false,
      errorMessage: 'Game wins cannot be negative',
    });
    expect(validateTeamStats('winner-1', 'loser-1', 2, -2).isValid).toBe(false);
  });

  it('coerces non-numeric game wins to 0 and passes (current fallback behavior)', () => {
    const { validateTeamStats } = setup();
    // parseInt('abc') is NaN, which the `|| 0` fallback converts to 0 — so this
    // is treated as a valid 0/0 update rather than rejected as non-numeric.
    expect(
      validateTeamStats('winner-1', 'loser-1', 'abc' as unknown as number, 1)
    ).toEqual({ isValid: true });
  });

  it('parses numeric strings as game wins', () => {
    const { validateTeamStats } = setup();
    expect(
      validateTeamStats(
        'winner-1',
        'loser-1',
        '2' as unknown as number,
        '1' as unknown as number
      )
    ).toEqual({ isValid: true });
  });
});
