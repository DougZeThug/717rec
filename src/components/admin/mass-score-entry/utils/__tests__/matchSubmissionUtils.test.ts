import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  matchLog: vi.fn(),
  warnLog: vi.fn(),
}));

import { validateMatchSubmission } from '../matchSubmissionUtils';

describe('validateMatchSubmission', () => {
  it('returns detailed failures and success states', () => {
    expect(validateMatchSubmission(null)).toEqual(
      expect.objectContaining({ isValid: false, errorMessage: 'Match data is missing' })
    );

    expect(
      validateMatchSubmission({
        id: 'm1',
        team1Id: 't1',
        team2Id: 't2',
        iscompleted: true,
        team1_game_wins: 1,
        team2_game_wins: 1,
        team1Score: 1,
        team2Score: 0,
      })
    ).toEqual(
      expect.objectContaining({ isValid: false, errorMessage: 'Game wins cannot be tied' })
    );

    expect(
      validateMatchSubmission({
        id: 'm2',
        team1Id: 't1',
        team2Id: 't2',
        iscompleted: true,
        team1_game_wins: 2,
        team2_game_wins: 1,
        team1Score: 1,
        team2Score: 0,
      })
    ).toEqual({ isValid: true });
  });
});
