import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FilterState } from '../../types';

const mockToast = vi.fn();
const mockBuildMatchQuery = vi.fn();
const mockTransform = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('../../services/matchQueryService', () => ({
  buildMatchQuery: (...args: unknown[]) => mockBuildMatchQuery(...args),
}));

vi.mock('../../utils/matchTransformUtils', () => ({
  transformDatabaseMatchToMatchWithTeams: (...args: unknown[]) => mockTransform(...args),
}));

vi.mock('@/utils/logger', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/utils/logger');
  return Object.fromEntries(Object.keys(actual).map((name) => [name, vi.fn()]));
});

import { useMatchFetching } from '../useMatchFetching';

describe('useMatchFetching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransform.mockImplementation((row: { id: string }) => ({
      id: row.id,
      date: '2026-06-20',
    }));
  });

  it('starts in a loading state', () => {
    const { result } = renderHook(() => useMatchFetching());
    expect(result.current.loading).toBe(true);
  });

  it('fetches, transforms each row, and clears loading on success', async () => {
    mockBuildMatchQuery.mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]);
    const filters: FilterState = { bracketId: 'b1' };

    const { result } = renderHook(() => useMatchFetching());
    const matches = await result.current.fetchMatches(filters);

    expect(mockBuildMatchQuery).toHaveBeenCalledWith(filters);
    expect(mockTransform).toHaveBeenCalledTimes(2);
    expect(matches).toEqual([
      { id: 'm1', date: '2026-06-20' },
      { id: 'm2', date: '2026-06-20' },
    ]);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('returns an empty array when the query yields no data', async () => {
    mockBuildMatchQuery.mockResolvedValue(null);

    const { result } = renderHook(() => useMatchFetching());
    const matches = await result.current.fetchMatches({});

    expect(matches).toEqual([]);
    expect(mockTransform).not.toHaveBeenCalled();
  });

  it('shows a destructive toast, returns [], and clears loading on error', async () => {
    mockBuildMatchQuery.mockRejectedValue(new Error('query failed'));

    const { result } = renderHook(() => useMatchFetching());
    const matches = await result.current.fetchMatches({});

    expect(matches).toEqual([]);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: expect.stringContaining('query failed'),
        variant: 'destructive',
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
