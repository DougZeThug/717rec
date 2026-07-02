import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MatchWithTeams } from '../../types';
import { useMatchValidation } from '../useMatchValidation';

const makeMatch = (overrides: Partial<MatchWithTeams> = {}): MatchWithTeams =>
  ({
    id: 'm1',
    team1Id: 't1',
    team2Id: 't2',
    team1Score: 0,
    team2Score: 0,
    iscompleted: false,
    ...overrides,
  }) as MatchWithTeams;

describe('useMatchValidation (root hook)', () => {
  describe('validateMatchScores', () => {
    it('accepts any integer pair', () => {
      const { result } = renderHook(() => useMatchValidation());

      expect(result.current.validateMatchScores(1, 0)).toBe(true);
      expect(result.current.validateMatchScores(0, 1)).toBe(true);
      // This validator only checks for integers, not binary values
      expect(result.current.validateMatchScores(3, 2)).toBe(true);
    });

    it('rejects missing or non-integer scores', () => {
      const { result } = renderHook(() => useMatchValidation());

      expect(result.current.validateMatchScores(null, 1)).toBe(false);
      expect(result.current.validateMatchScores(1, undefined)).toBe(false);
      expect(result.current.validateMatchScores(1.5, 0)).toBe(false);
    });
  });

  describe('handleScoreChange', () => {
    it('updates the targeted match scores and flags it edited and valid', () => {
      const { result } = renderHook(() => useMatchValidation());
      const matches = [makeMatch({ id: 'm1' }), makeMatch({ id: 'm2' })];

      const updated = result.current.handleScoreChange(matches, 1, 1, 0);

      expect(updated[1].team1Score).toBe(1);
      expect(updated[1].team2Score).toBe(0);
      expect(updated[1].isEdited).toBe(true);
      expect(updated[1].isValid).toBe(true);
      // Untouched match retains its state
      expect(updated[0].isEdited).toBeUndefined();
    });

    it('marks the match invalid when given a non-integer score', () => {
      const { result } = renderHook(() => useMatchValidation());
      const matches = [makeMatch()];

      const updated = result.current.handleScoreChange(matches, 0, 1.5, 0);

      expect(updated[0].isEdited).toBe(true);
      expect(updated[0].isValid).toBe(false);
    });
  });

  describe('handleMarkCompleted', () => {
    it('sets completion and edited flags on the targeted match', () => {
      const { result } = renderHook(() => useMatchValidation());
      const matches = [makeMatch({ iscompleted: false })];

      const updated = result.current.handleMarkCompleted(matches, 0, true);

      expect(updated[0].iscompleted).toBe(true);
      expect(updated[0].isEdited).toBe(true);

      const reverted = result.current.handleMarkCompleted(updated, 0, false);
      expect(reverted[0].iscompleted).toBe(false);
    });
  });
});
