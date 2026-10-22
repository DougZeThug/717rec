import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MatchWithTeams } from '../../../types';

vi.mock('@/utils/logger', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/utils/logger');
  return Object.fromEntries(Object.keys(actual).map((name) => [name, vi.fn()]));
});

import { useMatchesState } from '../useMatchesState';

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

describe('useMatchesState', () => {
  it('starts empty with no matches', () => {
    const { result } = renderHook(() => useMatchesState());

    expect(result.current.matches).toEqual([]);
    expect(result.current.originalMatches.size).toBe(0);
    expect(result.current.submitting).toBe(false);
  });

  it('setMatches with an array snapshots the originals as independent copies', () => {
    const { result } = renderHook(() => useMatchesState());
    const fetched = [makeMatch({ id: 'm1' }), makeMatch({ id: 'm2' })];

    act(() => {
      result.current.setMatches(fetched);
    });

    expect(result.current.matches).toEqual(fetched);
    expect(result.current.originalMatches.size).toBe(2);
    const snapshot = result.current.originalMatches.get('m1');
    expect(snapshot).toEqual(fetched[0]);
    // Snapshot must be a copy, not the same object reference
    expect(snapshot).not.toBe(fetched[0]);
  });

  it('setMatches with an updater function does not overwrite the original snapshot', () => {
    const { result } = renderHook(() => useMatchesState());

    act(() => {
      result.current.setMatches([makeMatch({ id: 'm1', team1Score: 0 })]);
    });

    act(() => {
      result.current.setMatches((prev) => prev.map((m) => ({ ...m, team1Score: 1 })));
    });

    expect(result.current.matches[0].team1Score).toBe(1);
    // Original snapshot still holds the fetched value
    expect(result.current.originalMatches.get('m1')?.team1Score).toBe(0);
  });

  it('exposes a working submitting setter', () => {
    const { result } = renderHook(() => useMatchesState());

    act(() => {
      result.current.setSubmitting(true);
    });

    expect(result.current.submitting).toBe(true);
  });
});
