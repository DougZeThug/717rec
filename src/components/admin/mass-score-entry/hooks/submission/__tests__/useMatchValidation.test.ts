import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MatchWithTeams } from '../../../types';

const mockAddError = vi.fn();

vi.mock('../../useSubmissionState', () => ({
  useSubmissionState: () => ({ addError: mockAddError }),
}));

vi.mock('@/utils/logger', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/utils/logger');
  return Object.fromEntries(Object.keys(actual).map((name) => [name, vi.fn()]));
});

import { useMatchValidation } from '../useMatchValidation';

const makeMatch = (overrides: Partial<MatchWithTeams> = {}): MatchWithTeams =>
  ({
    id: 'm1',
    team1Id: 't1',
    team2Id: 't2',
    team1Score: 0,
    team2Score: 0,
    team1_game_wins: 2,
    team2_game_wins: 1,
    iscompleted: true,
    date: '2026-06-20T18:00:00.000Z',
    ...overrides,
  }) as MatchWithTeams;

describe('useMatchValidation (submission)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recalculates binary scores from game wins when team 1 has more wins', () => {
    const { result } = renderHook(() => useMatchValidation());

    const validation = result.current.validateMatch(makeMatch());

    expect(validation.isValid).toBe(true);
    expect(validation.correctedMatch).toMatchObject({
      team1Score: 1,
      team2Score: 0,
      team1_game_wins: 2,
      team2_game_wins: 1,
    });
    expect(mockAddError).not.toHaveBeenCalled();
  });

  it('recalculates binary scores when team 2 has more wins and parses string game wins', () => {
    const { result } = renderHook(() => useMatchValidation());

    const validation = result.current.validateMatch(
      makeMatch({
        team1_game_wins: '1' as unknown as number,
        team2_game_wins: '3' as unknown as number,
      })
    );

    expect(validation.isValid).toBe(true);
    expect(validation.correctedMatch).toMatchObject({
      team1Score: 0,
      team2Score: 1,
      team1_game_wins: 1,
      team2_game_wins: 3,
    });
  });

  it('does not mutate the input match', () => {
    const { result } = renderHook(() => useMatchValidation());
    const input = makeMatch({ team1Score: 0, team2Score: 0 });

    const validation = result.current.validateMatch(input);

    expect(input.team1Score).toBe(0);
    expect(input.team2Score).toBe(0);
    expect(validation.correctedMatch).not.toBe(input);
  });

  it('rejects tied game wins and records the error', () => {
    const { result } = renderHook(() => useMatchValidation());

    const validation = result.current.validateMatch(
      makeMatch({ team1_game_wins: 2, team2_game_wins: 2 })
    );

    expect(validation.isValid).toBe(false);
    expect(validation.correctedMatch).toBeUndefined();
    expect(mockAddError).toHaveBeenCalledWith('m1', 'Game wins cannot be tied');
  });

  it('rejects a completed match with missing team data via the submission validator', () => {
    const { result } = renderHook(() => useMatchValidation());

    const validation = result.current.validateMatch(
      makeMatch({ team1Id: '' as unknown as string })
    );

    expect(validation.isValid).toBe(false);
    expect(mockAddError).toHaveBeenCalledWith('m1', 'Missing team data');
  });
});
