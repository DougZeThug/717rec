import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({ chartLog: vi.fn() }));

import { type ChartDataItem, useSortedWinLossData } from '../useSortedWinLossData';

const item = (
  id: string,
  name: string,
  wins: number,
  losses: number,
  extra: Partial<ChartDataItem> = {}
): ChartDataItem => ({ id, name, wins, losses, ...extra });

describe('useSortedWinLossData', () => {
  it('returns an empty array for no data', () => {
    const { result } = renderHook(() => useSortedWinLossData([], 5));
    expect(result.current).toEqual([]);
  });

  it('returns an empty array when data is not an array', () => {
    const { result } = renderHook(() =>
      useSortedWinLossData(undefined as unknown as ChartDataItem[], 5)
    );
    expect(result.current).toEqual([]);
  });

  it('sorts by calculated win percentage descending', () => {
    const data = [
      item('a', 'Alpha', 1, 3), // 25%
      item('b', 'Bravo', 3, 1), // 75%
      item('c', 'Charlie', 2, 2), // 50%
    ];
    const { result } = renderHook(() => useSortedWinLossData(data, 5));
    expect(result.current.map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('prefers a provided win_percentage over the calculated one', () => {
    const data = [
      item('a', 'Alpha', 0, 4, { win_percentage: 0.99 }), // would be 0% calculated
      item('b', 'Bravo', 4, 0), // 100% calculated
    ];
    const { result } = renderHook(() => useSortedWinLossData(data, 5));
    expect(result.current.map((t) => t.id)).toEqual(['b', 'a']);
    expect(result.current[1].win_percentage).toBe(0.99);
  });

  it('falls back to the legacy winPercentage field', () => {
    const data = [item('a', 'Alpha', 0, 0, { winPercentage: 0.6 })];
    const { result } = renderHook(() => useSortedWinLossData(data, 5));
    expect(result.current[0].win_percentage).toBe(0.6);
  });

  it('breaks win percentage ties by total wins, then alphabetically', () => {
    const data = [
      item('zeta', 'Zeta', 2, 2), // 50%, 2 wins
      item('more-wins', 'More Wins', 4, 4), // 50%, 4 wins
      item('alpha', 'Alpha', 2, 2), // 50%, 2 wins
    ];
    const { result } = renderHook(() => useSortedWinLossData(data, 5));
    expect(result.current.map((t) => t.id)).toEqual(['more-wins', 'alpha', 'zeta']);
  });

  it('respects the chart limit', () => {
    const data = Array.from({ length: 6 }, (_, i) => item(`t${i}`, `Team ${i}`, i, 1));
    const { result } = renderHook(() => useSortedWinLossData(data, 3));
    expect(result.current).toHaveLength(3);
  });

  it('numbers display names by final position', () => {
    const data = [item('a', 'Alpha', 1, 3), item('b', 'Bravo', 3, 1)];
    const { result } = renderHook(() => useSortedWinLossData(data, 5));
    expect(result.current[0].displayName).toBe('1. Bravo');
    expect(result.current[1].displayName).toBe('2. Alpha');
  });

  it('generates a fallback tooltip name for teams with blank names', () => {
    const data = [item('a', '  ', 2, 0)];
    const { result } = renderHook(() => useSortedWinLossData(data, 5));
    expect(result.current[0].tooltipName).toBe('Team 1');
  });

  it('keeps 0-0 teams only while under the chart limit', () => {
    const data = [
      item('played-1', 'Played One', 3, 1),
      item('played-2', 'Played Two', 2, 2),
      item('unplayed', 'Unplayed', 0, 0),
    ];
    const { result } = renderHook(() => useSortedWinLossData(data, 2));
    // 0-0 team sorts last and falls outside the limit of 2
    expect(result.current.map((t) => t.id)).toEqual(['played-1', 'played-2']);
  });

  it('exposes calculatedWinPct for tooltip backward compatibility', () => {
    const data = [item('a', 'Alpha', 3, 1)];
    const { result } = renderHook(() => useSortedWinLossData(data, 5));
    expect(result.current[0].calculatedWinPct).toBe(0.75);
  });
});
