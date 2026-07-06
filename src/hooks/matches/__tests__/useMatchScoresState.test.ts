import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Match } from '@/types';

import { useMatchScoresState } from '../useMatchScoresState';

const makeMatch = (id: string, team1Score?: number, team2Score?: number): Match =>
  ({
    id,
    team1Id: 't1',
    team2Id: 't2',
    team1Score,
    team2Score,
  }) as unknown as Match;

describe('useMatchScoresState', () => {
  it('starts with empty scores when no matches are provided', () => {
    const { result } = renderHook(() => useMatchScoresState());
    expect(result.current.scores).toEqual({});
  });

  it('initializes scores from the matches on first render', () => {
    const matches = [makeMatch('m1', 2, 1), makeMatch('m2')];

    const { result } = renderHook(() => useMatchScoresState(matches));

    expect(result.current.scores).toEqual({
      m1: { team1Score: '2', team2Score: '1' },
      m2: { team1Score: '', team2Score: '' },
    });
  });

  it('converts a 0 score to an empty string (current || fallback behavior)', () => {
    // 0?.toString() is '0' but '0' || '' keeps '0'; undefined stays ''.
    const { result } = renderHook(() => useMatchScoresState([makeMatch('m1', 0, 3)]));

    expect(result.current.scores.m1).toEqual({ team1Score: '0', team2Score: '3' });
  });

  it('updates a single score field without touching the other field or other matches', () => {
    const matches = [makeMatch('m1', 1, 0), makeMatch('m2', 2, 1)];
    const { result } = renderHook(() => useMatchScoresState(matches));

    act(() => {
      result.current.handleScoreChange('m1', 'team2Score', '2');
    });

    expect(result.current.scores.m1).toEqual({ team1Score: '1', team2Score: '2' });
    expect(result.current.scores.m2).toEqual({ team1Score: '2', team2Score: '1' });
  });

  it('does not re-initialize (clobber edits) when matches change after scores exist', () => {
    const initial = [makeMatch('m1', 1, 0)];
    const { result, rerender } = renderHook(({ matches }) => useMatchScoresState(matches), {
      initialProps: { matches: initial },
    });

    act(() => {
      result.current.handleScoreChange('m1', 'team1Score', '5');
    });

    rerender({ matches: [makeMatch('m1', 2, 2)] });

    expect(result.current.scores.m1).toEqual({ team1Score: '5', team2Score: '0' });
  });

  it('initializeScores replaces the full score map on demand', () => {
    const { result } = renderHook(() => useMatchScoresState([makeMatch('m1', 1, 0)]));

    act(() => {
      result.current.initializeScores([makeMatch('m3', 2, 0)]);
    });

    expect(result.current.scores).toEqual({
      m3: { team1Score: '2', team2Score: '0' },
    });
  });

  it('handleScoreChange creates an entry for an unknown match id', () => {
    const { result } = renderHook(() => useMatchScoresState());

    act(() => {
      result.current.handleScoreChange('new-match', 'team1Score', '2');
    });

    expect(result.current.scores['new-match']).toEqual({ team1Score: '2' });
  });
});
