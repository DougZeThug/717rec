import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockBrackets = [{ id: 'b1', title: 'Bracket 1' }];

vi.mock('@/hooks/brackets/useBracketsQuery', () => ({
  useBracketsQuery: () => ({ brackets: mockBrackets }),
}));

vi.mock('@/utils/logger', () => ({
  filterLog: vi.fn(),
}));

import { useFiltersState } from '../useFiltersState';

describe('useFiltersState', () => {
  it('handles filter state transitions', () => {
    const { result } = renderHook(() => useFiltersState());

    expect(result.current.filters).toEqual({});
    expect(result.current.brackets).toEqual(mockBrackets);

    const filterDate = new Date('2026-01-10T00:00:00.000Z');

    act(() => {
      result.current.setFilterDate(filterDate);
    });
    expect(result.current.filters.date).toEqual(filterDate);

    act(() => {
      result.current.setBracketFilter('b1');
    });
    expect(result.current.filters.bracketId).toBe('b1');

    act(() => {
      result.current.updateFiltersForMatchDate(new Date('2026-01-10T00:00:00.000Z'));
    });
    expect(result.current.filters.date).toEqual(filterDate);

    const updatedDate = new Date('2026-01-12T00:00:00.000Z');
    act(() => {
      result.current.updateFiltersForMatchDate(updatedDate);
    });
    expect(result.current.filters.date).toEqual(updatedDate);

    act(() => {
      result.current.clearFilters();
    });
    expect(result.current.filters).toEqual({});
  });
});
