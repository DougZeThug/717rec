import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePlayerNames } from '../usePlayerNames';

const player = (id: string, display_name: string) => ({ id, display_name });

describe('usePlayerNames (one id-to-name lookup for both rosters)', () => {
  it('merges both teams into a single lookup', () => {
    const { result } = renderHook(() =>
      usePlayerNames([player('a', 'Alice')], [player('b', 'Bob')])
    );

    expect(result.current).toEqual({ a: 'Alice', b: 'Bob' });
  });

  it('is empty when neither roster has loaded', () => {
    const { result } = renderHook(() => usePlayerNames([], []));

    expect(result.current).toEqual({});
  });

  // The same person can appear on both rosters across a season; the lookup is
  // keyed by id, so the later entry simply wins rather than the map breaking.
  it('keeps one entry per id', () => {
    const { result } = renderHook(() =>
      usePlayerNames([player('a', 'Alice')], [player('a', 'Alice B.')])
    );

    expect(result.current).toEqual({ a: 'Alice B.' });
  });

  it('keeps the same object while the rosters are unchanged', () => {
    const team1 = [player('a', 'Alice')];
    const team2 = [player('b', 'Bob')];
    const { result, rerender } = renderHook(() => usePlayerNames(team1, team2));
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});
