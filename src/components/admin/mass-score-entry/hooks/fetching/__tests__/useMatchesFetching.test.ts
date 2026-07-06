import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FilterState } from '../../../types';

const mockToast = vi.fn();
const mockFetchMatchesForAdmin = vi.fn();
const mockTransform = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/services/matches/MatchReadService', () => ({
  fetchMatchesForAdmin: (...args: unknown[]) => mockFetchMatchesForAdmin(...args),
}));

vi.mock('../../../utils/matchTransformUtils', () => ({
  transformDatabaseMatchToMatchWithTeams: (...args: unknown[]) => mockTransform(...args),
}));

vi.mock('@/utils/logger', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/utils/logger');
  return Object.fromEntries(Object.keys(actual).map((name) => [name, vi.fn()]));
});

import { useMatchesFetching } from '../useMatchesFetching';

describe('useMatchesFetching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransform.mockImplementation((row: { id: string }) => ({ id: row.id, transformed: true }));
  });

  it('fetches matches with the given filters and maps each row through the transform', async () => {
    const rows = [{ id: 'm1' }, { id: 'm2' }];
    mockFetchMatchesForAdmin.mockResolvedValue(rows);
    const filters: FilterState = { bracketId: 'b1' };

    const { result } = renderHook(() => useMatchesFetching());
    const matches = await result.current.fetchMatches(filters);

    expect(mockFetchMatchesForAdmin).toHaveBeenCalledWith(filters);
    expect(mockTransform).toHaveBeenCalledTimes(2);
    expect(matches).toEqual([
      { id: 'm1', transformed: true },
      { id: 'm2', transformed: true },
    ]);
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('returns an empty array and shows a destructive toast when the service throws', async () => {
    mockFetchMatchesForAdmin.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useMatchesFetching());
    const matches = await result.current.fetchMatches({});

    expect(matches).toEqual([]);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: expect.stringContaining('network down'),
        variant: 'destructive',
      })
    );
  });

  it('reports "Unknown error" for non-Error rejections', async () => {
    mockFetchMatchesForAdmin.mockRejectedValue('boom');

    const { result } = renderHook(() => useMatchesFetching());
    const matches = await result.current.fetchMatches({});

    expect(matches).toEqual([]);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining('Unknown error') })
    );
  });
});
