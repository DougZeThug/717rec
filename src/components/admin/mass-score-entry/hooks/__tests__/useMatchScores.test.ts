import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MatchWithTeams } from '../../types';

vi.mock('@/utils/logger', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/utils/logger');
  return Object.fromEntries(Object.keys(actual).map((name) => [name, vi.fn()]));
});

import { useMatchScores } from '../useMatchScores';

const makeMatch = (overrides: Partial<MatchWithTeams> = {}): MatchWithTeams =>
  ({
    id: 'm1',
    team1Id: 't1',
    team2Id: 't2',
    team1Score: 0,
    team2Score: 0,
    team1_game_wins: 0,
    team2_game_wins: 0,
    iscompleted: false,
    ...overrides,
  }) as MatchWithTeams;

// Drives the hook with an externally-held matches array so the functional
// setMatches updater can be exercised exactly as React would call it.
const setup = (initial: MatchWithTeams[]) => {
  let matches = initial;
  const setMatches = (
    updater: MatchWithTeams[] | ((prev: MatchWithTeams[]) => MatchWithTeams[])
  ) => {
    matches = typeof updater === 'function' ? updater(matches) : updater;
  };
  const view = renderHook(({ current }) => useMatchScores(current, setMatches), {
    initialProps: { current: matches },
  });
  return { view, getMatches: () => matches };
};

describe('useMatchScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleScoreChange', () => {
    it('sets binary scores, marks edited, and validates a 1-0 result', () => {
      const { view, getMatches } = setup([makeMatch()]);

      view.result.current.handleScoreChange(0, 1, 0);

      const updated = getMatches()[0];
      expect(updated.team1Score).toBe(1);
      expect(updated.team2Score).toBe(0);
      expect(updated.isEdited).toBe(true);
      expect(updated.isValid).toBe(true);
    });

    it('marks a non-binary score combination invalid', () => {
      const { view, getMatches } = setup([makeMatch()]);

      view.result.current.handleScoreChange(0, 2, 2);

      expect(getMatches()[0].isEdited).toBe(true);
      expect(getMatches()[0].isValid).toBe(false);
    });

    it('leaves state untouched when the index does not exist', () => {
      const initial = [makeMatch()];
      const { view, getMatches } = setup(initial);

      view.result.current.handleScoreChange(5, 1, 0);

      // Same array reference returned -> no update happened
      expect(getMatches()).toBe(initial);
    });
  });

  describe('handleGameWinsChange', () => {
    it('updates game wins, marks edited, and validates against current scores', () => {
      const { view, getMatches } = setup([makeMatch({ team1Score: 1, team2Score: 0 })]);

      view.result.current.handleGameWinsChange(0, 2, 1);

      const updated = getMatches()[0];
      expect(updated.team1_game_wins).toBe(2);
      expect(updated.team2_game_wins).toBe(1);
      expect(updated.isEdited).toBe(true);
      // Existing 1-0 scores are valid
      expect(updated.isValid).toBe(true);
    });

    it('flags invalid when the current scores are not a valid binary result', () => {
      const { view, getMatches } = setup([makeMatch({ team1Score: 0, team2Score: 0 })]);

      view.result.current.handleGameWinsChange(0, 2, 1);

      expect(getMatches()[0].isValid).toBe(false);
    });

    it('leaves state untouched when the index does not exist', () => {
      const initial = [makeMatch()];
      const { view, getMatches } = setup(initial);

      view.result.current.handleGameWinsChange(3, 2, 1);

      expect(getMatches()).toBe(initial);
    });
  });

  describe('handleMarkCompleted', () => {
    it('validates scores when marking completed', () => {
      const { view, getMatches } = setup([makeMatch({ team1Score: 1, team2Score: 0 })]);

      view.result.current.handleMarkCompleted(0, true);

      const updated = getMatches()[0];
      expect(updated.iscompleted).toBe(true);
      expect(updated.isEdited).toBe(true);
      expect(updated.isValid).toBe(true);
    });

    it('keeps the previous validity when un-completing', () => {
      const { view, getMatches } = setup([
        makeMatch({ iscompleted: true, isValid: false, team1Score: 0, team2Score: 0 }),
      ]);

      view.result.current.handleMarkCompleted(0, false);

      const updated = getMatches()[0];
      expect(updated.iscompleted).toBe(false);
      // isValid untouched because checked === false
      expect(updated.isValid).toBe(false);
    });

    it('leaves state untouched when the index does not exist', () => {
      const initial = [makeMatch()];
      const { view, getMatches } = setup(initial);

      view.result.current.handleMarkCompleted(7, true);

      expect(getMatches()).toBe(initial);
    });
  });

  describe('validationErrors', () => {
    it('collects an error entry for each edited-but-invalid match', () => {
      const matches = [
        makeMatch({ id: 'm1', isEdited: true, isValid: false }),
        makeMatch({ id: 'm2', isEdited: true, isValid: true }),
        makeMatch({ id: 'm3', isEdited: false, isValid: false }),
      ];
      const { view } = setup(matches);

      expect(view.result.current.validationErrors).toEqual({ 0: 'Invalid score values' });
    });
  });
});
