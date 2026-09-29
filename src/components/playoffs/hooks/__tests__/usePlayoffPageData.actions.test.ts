import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BRACKET_FORMATS, BRACKET_STATES } from '@/constants/brackets';

// The actions the page hands its children: opening and closing a bracket,
// deleting one, and the division and bracket lists it derives for them.
const { queryClient, deleteBracketService } = vi.hoisted(() => ({
  // One client for every render, so a test can check the calls made on it.
  queryClient: {
    invalidateQueries: vi.fn(),
    removeQueries: vi.fn(),
    prefetchQuery: vi.fn(),
  },
  deleteBracketService: vi.fn(),
}));

/** The address bar, shared by the hook and the assertions. */
let searchParams = new URLSearchParams();
const setSearchParams = vi.fn((next: URLSearchParams) => {
  searchParams = new URLSearchParams(next);
});

// Each test sets these once. The hook sees the same objects on every render,
// as it would from a settled query.
const divisionsRef = { current: [] as Array<{ display_division: string | null }> };
const bracketsByDivisionRef = { current: {} as Record<string, unknown> };

vi.mock('@tanstack/react-query', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return { ...actual, useQueryClient: () => queryClient };
});

vi.mock('react-router', () => ({
  useSearchParams: () => [searchParams, setSearchParams] as const,
}));

vi.mock('@/hooks/useSeasons', () => ({
  useActiveSeason: () => ({ data: null }),
  usePlayoffActiveSeason: () => ({ data: null }),
}));

vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdminAccessGranted: true, isLoading: false }),
}));

vi.mock('@/hooks/useDivisions', () => ({
  useDivisions: () => ({ divisions: divisionsRef.current, isLoading: false, error: null }),
}));

vi.mock('@/hooks/brackets/useBracketData', () => ({
  useBracketData: () => ({ data: null, isLoading: false, error: null, refetch: vi.fn() }),
}));

vi.mock('@/hooks/playoffs/usePlayoffTeams', () => ({
  usePlayoffTeams: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/usePlayoffViewModel.compat', () => ({
  usePlayoffData: () => ({
    bracketsLoading: false,
    teamsByDivision: {},
    bracketsByDivision: bracketsByDivisionRef.current,
    handleBracketCreated: vi.fn(),
    handleTeamDivisionChange: vi.fn(),
    refetchBrackets: vi.fn(),
    error: null,
  }),
}));

vi.mock('@/services/brackets/BracketWriteService', () => ({
  deleteBracket: deleteBracketService,
}));

import { ValidationError } from '@/types/errors';

import { usePlayoffPageData } from '../usePlayoffPageData';

beforeEach(() => {
  searchParams = new URLSearchParams();
  divisionsRef.current = [];
  bracketsByDivisionRef.current = {};
  queryClient.invalidateQueries.mockImplementation(() => Promise.resolve());
  queryClient.prefetchQuery.mockImplementation(() => Promise.resolve());
  deleteBracketService.mockImplementation(() => Promise.resolve());
});

describe('usePlayoffPageData setSelectedBracketId', () => {
  it('opens the bracket, puts it in the address and preloads it', () => {
    const { result } = renderHook(() => usePlayoffPageData());

    act(() => result.current.setSelectedBracketId('b-1'));

    expect(result.current.selectedBracketId).toBe('b-1');
    expect(searchParams.get('bracket')).toBe('b-1');
    expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['bracket-data', 'b-1'] })
    );
  });

  it('closes the bracket and takes it out of the address', () => {
    searchParams = new URLSearchParams('bracket=b-1');
    const { result } = renderHook(() => usePlayoffPageData());
    expect(result.current.selectedBracketId).toBe('b-1');

    act(() => result.current.setSelectedBracketId(null));

    expect(result.current.selectedBracketId).toBeNull();
    expect(searchParams.has('bracket')).toBe(false);
    expect(queryClient.prefetchQuery).not.toHaveBeenCalled();
  });
});

describe('usePlayoffPageData deleteBracket', () => {
  it('deletes the open bracket, clears its cache and closes it', async () => {
    searchParams = new URLSearchParams('bracket=b-1');
    const { result } = renderHook(() => usePlayoffPageData());

    await act(() => result.current.deleteBracket('b-1', 'Gold'));

    expect(deleteBracketService).toHaveBeenCalledWith('b-1');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['brackets'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['bracket-data', 'b-1'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['playoff-matches', 'b-1'],
    });
    expect(queryClient.removeQueries).toHaveBeenCalledWith({ queryKey: ['bracket-data', 'b-1'] });
    expect(result.current.selectedBracketId).toBeNull();
    expect(searchParams.has('bracket')).toBe(false);
  });

  it('keeps the open bracket when another one is deleted', async () => {
    searchParams = new URLSearchParams('bracket=b-1');
    const { result } = renderHook(() => usePlayoffPageData());

    await act(() => result.current.deleteBracket('b-2', 'Silver'));

    expect(deleteBracketService).toHaveBeenCalledWith('b-2');
    expect(result.current.selectedBracketId).toBe('b-1');
    expect(searchParams.get('bracket')).toBe('b-1');
  });

  it('rejects with a readable message and leaves the cache alone when the delete fails', async () => {
    const cause = new ValidationError('in use');
    deleteBracketService.mockRejectedValue(cause);
    const { result } = renderHook(() => usePlayoffPageData());

    const attempt = result.current.deleteBracket('b-1', 'Gold');

    await expect(attempt).rejects.toThrow('Failed to delete bracket: in use');
    await expect(attempt).rejects.toMatchObject({ cause });
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(queryClient.removeQueries).not.toHaveBeenCalled();
  });
});

describe('usePlayoffPageData derived lists', () => {
  it('fills in missing bracket fields and empties a division that is not a list', () => {
    bracketsByDivisionRef.current = {
      Gold: [{ id: 'b-1', name: 'Gold bracket' }],
      Silver: [
        {
          id: 'b-2',
          state: BRACKET_STATES.COMPLETED,
          format: BRACKET_FORMATS.SINGLE,
          matches: [{ id: 'm-1' }],
        },
      ],
      Broken: null,
    };

    const { result } = renderHook(() => usePlayoffPageData());
    const { typesafeBracketsByDivision } = result.current;

    expect(typesafeBracketsByDivision.Gold).toEqual([
      {
        id: 'b-1',
        name: 'Gold bracket',
        matches: [],
        state: BRACKET_STATES.PENDING,
        format: BRACKET_FORMATS.DOUBLE,
      },
    ]);
    expect(typesafeBracketsByDivision.Silver[0]).toMatchObject({
      id: 'b-2',
      state: BRACKET_STATES.COMPLETED,
      format: BRACKET_FORMATS.SINGLE,
      matches: [{ id: 'm-1' }],
    });
    expect(typesafeBracketsByDivision.Broken).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('gives a bracket with no id a generated one', () => {
    bracketsByDivisionRef.current = { Gold: [{ name: 'No id yet' }] };

    const { result } = renderHook(() => usePlayoffPageData());

    expect(result.current.typesafeBracketsByDivision.Gold[0].id).toEqual(expect.any(String));
    expect(result.current.typesafeBracketsByDivision.Gold[0].id).not.toBe('');
  });

  it('lists each shown division once, without hidden or blank ones', () => {
    divisionsRef.current = [
      { display_division: 'Gold' },
      { display_division: 'Silver' },
      { display_division: 'Gold' },
      { display_division: 'Hidden' },
      { display_division: '' },
      { display_division: null },
    ];

    const { result } = renderHook(() => usePlayoffPageData());

    expect(result.current.availableDivisions).toEqual(['Gold', 'Silver']);
  });
});
