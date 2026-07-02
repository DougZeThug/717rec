import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockBrackets = [{ id: 'b1', title: 'Bracket 1' }];

vi.mock('@/hooks/brackets/useBracketsQuery', () => ({
  useBracketsQuery: () => ({ brackets: mockBrackets }),
}));

vi.mock('@/utils/logger', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/utils/logger');
  return Object.fromEntries(Object.keys(actual).map((name) => [name, vi.fn()]));
});

import { useMatchFilters } from '../useMatchFilters';

describe('useMatchFilters', () => {
  it('starts with empty filters and exposes brackets from the query hook', () => {
    const { result } = renderHook(() => useMatchFilters());

    expect(result.current.filters).toEqual({});
    expect(result.current.brackets).toEqual(mockBrackets);
  });

  it('sets and clears date and bracket filters', () => {
    const { result } = renderHook(() => useMatchFilters());
    const filterDate = new Date('2026-01-10T00:00:00.000Z');

    act(() => {
      result.current.setFilterDate(filterDate);
    });
    expect(result.current.filters.date).toEqual(filterDate);

    act(() => {
      result.current.setBracketFilter('b1');
    });
    expect(result.current.filters.bracketId).toBe('b1');
    // Date filter is preserved when the bracket changes
    expect(result.current.filters.date).toEqual(filterDate);

    act(() => {
      result.current.clearFilters();
    });
    expect(result.current.filters).toEqual({});
  });

  it('updateFiltersForMatchDate only updates when the date actually differs', () => {
    const { result } = renderHook(() => useMatchFilters());
    const firstDate = new Date('2026-01-10T00:00:00.000Z');

    // No date set yet -> updates
    act(() => {
      result.current.updateFiltersForMatchDate(firstDate);
    });
    expect(result.current.filters.date).toEqual(firstDate);

    // Same timestamp -> no change (same object retained)
    const sameInstant = new Date('2026-01-10T00:00:00.000Z');
    act(() => {
      result.current.updateFiltersForMatchDate(sameInstant);
    });
    expect(result.current.filters.date).toBe(firstDate);

    // Different timestamp -> updates
    const laterDate = new Date('2026-01-12T00:00:00.000Z');
    act(() => {
      result.current.updateFiltersForMatchDate(laterDate);
    });
    expect(result.current.filters.date).toEqual(laterDate);
  });
});
