import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Same stubs as the season-from-bracket suite, with a refetch that can make the
// bracket query succeed: this is about a bracket link opened while the bracket
// cannot be read, and what happens once it can.
const playoffSeasonRef = { current: undefined as undefined | null | { id: string } };
const activeSeasonRef = { current: undefined as undefined | null | { id: string } };
const bracketRef = {
  current: { data: null, isLoading: false, error: null } as {
    data: { id: string; seasonId?: string | null } | null;
    isLoading: boolean;
    error: unknown;
  },
};
const refetchSpy = vi.fn();

/** The address bar, shared by the hook and the assertions. */
let searchParams = new URLSearchParams();
const setSearchParams = vi.fn((next: URLSearchParams, options?: { replace?: boolean }) => {
  searchParams = new URLSearchParams(next);
  return options;
});

vi.mock('@tanstack/react-query', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn().mockImplementation(() => Promise.resolve()),
      removeQueries: vi.fn(),
      prefetchQuery: vi.fn().mockImplementation(() => Promise.resolve()),
    }),
  };
});

vi.mock('react-router', () => ({
  useSearchParams: () => [searchParams, setSearchParams] as const,
}));

vi.mock('@/hooks/useSeasons', () => ({
  useActiveSeason: () => ({ data: activeSeasonRef.current }),
  usePlayoffActiveSeason: () => ({ data: playoffSeasonRef.current }),
}));

vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdminAccessGranted: false, isLoading: false }),
}));

vi.mock('@/hooks/useDivisions', () => ({
  useDivisions: () => ({ divisions: [], isLoading: false, error: null }),
}));

vi.mock('@/hooks/brackets/useBracketData', () => ({
  useBracketData: () => ({ ...bracketRef.current, refetch: refetchSpy }),
}));

vi.mock('@/hooks/playoffs/usePlayoffTeams', () => ({
  usePlayoffTeams: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/usePlayoffViewModel.compat', () => ({
  usePlayoffData: () => ({
    brackets: [],
    bracketsLoading: false,
    teamsByDivision: {},
    bracketsByDivision: {},
    handleBracketCreated: vi.fn(),
    handleTeamDivisionChange: vi.fn(),
    refetchBrackets: vi.fn().mockImplementation(() => Promise.resolve()),
    error: null,
  }),
}));

vi.mock('@/services/brackets/BracketWriteService', () => ({
  deleteBracket: vi.fn(),
}));

import { usePlayoffPageData } from '../usePlayoffPageData';

beforeEach(() => {
  vi.clearAllMocks();
  refetchSpy.mockImplementation(() => Promise.resolve());
  searchParams = new URLSearchParams();
  playoffSeasonRef.current = { id: 'current-season' };
  activeSeasonRef.current = { id: 'current-season' };
  bracketRef.current = { data: null, isLoading: false, error: null };
});

describe('usePlayoffPageData season after a bracket link fails to load', () => {
  // The page has to show a season while the bracket is unreadable, but that
  // season is a guess. Putting it in the address made the guess permanent:
  // the retry could not change it, and neither could a reload.
  it('keeps the stand-in season out of the address', () => {
    searchParams = new URLSearchParams('bracket=b-past');
    bracketRef.current = { data: null, isLoading: false, error: new Error('fetch failed') };

    const { result } = renderHook(() => usePlayoffPageData());

    expect(result.current.selectedSeasonId).toBe('current-season');
    expect(searchParams.get('season')).toBeNull();
    expect(searchParams.get('bracket')).toBe('b-past');
  });

  it('takes the season from the bracket once a retry succeeds', async () => {
    searchParams = new URLSearchParams('bracket=b-past');
    bracketRef.current = { data: null, isLoading: false, error: new Error('fetch failed') };

    const { result, rerender } = renderHook(() => usePlayoffPageData());
    expect(result.current.selectedSeasonId).toBe('current-season');

    refetchSpy.mockImplementation(() => {
      bracketRef.current = {
        data: { id: 'b-past', seasonId: 'past-season' },
        isLoading: false,
        error: null,
      };
      return Promise.resolve();
    });

    await act(async () => {
      result.current.retrySelectedBracket();
    });
    rerender();

    expect(result.current.selectedSeasonId).toBe('past-season');
    expect(searchParams.get('season')).toBe('past-season');
    expect(searchParams.get('bracket')).toBe('b-past');
  });

  // The reader has said nothing here, so the stand-in must not outrank the
  // bracket when the bracket finally arrives.
  it('takes the season from the bracket when a slow load finally settles', () => {
    searchParams = new URLSearchParams('bracket=b-past');
    bracketRef.current = { data: null, isLoading: false, error: new Error('not yet') };

    const { result, rerender } = renderHook(() => usePlayoffPageData());
    expect(result.current.selectedSeasonId).toBe('current-season');

    bracketRef.current = {
      data: { id: 'b-past', seasonId: 'past-season' },
      isLoading: false,
      error: null,
    };
    rerender();

    expect(result.current.selectedSeasonId).toBe('past-season');
  });

  // A season the reader asked for is a decision, not a stand-in. It stays.
  it('leaves a season named in the address alone when the bracket recovers', () => {
    searchParams = new URLSearchParams('bracket=b-past&season=chosen-season');
    bracketRef.current = { data: null, isLoading: false, error: new Error('fetch failed') };

    const { result, rerender } = renderHook(() => usePlayoffPageData());
    expect(result.current.selectedSeasonId).toBe('chosen-season');

    bracketRef.current = {
      data: { id: 'b-past', seasonId: 'past-season' },
      isLoading: false,
      error: null,
    };
    rerender();

    expect(result.current.selectedSeasonId).toBe('chosen-season');
    expect(searchParams.get('season')).toBe('chosen-season');
  });

  // Same for a season picked from the picker after the failure.
  it('leaves a season picked by the reader alone when the bracket recovers', () => {
    searchParams = new URLSearchParams('bracket=b-past');
    bracketRef.current = { data: null, isLoading: false, error: new Error('fetch failed') };

    const { result, rerender } = renderHook(() => usePlayoffPageData());

    act(() => result.current.setSelectedSeasonId('picked-season'));
    expect(result.current.selectedSeasonId).toBe('picked-season');

    bracketRef.current = {
      data: { id: 'b-past', seasonId: 'past-season' },
      isLoading: false,
      error: null,
    };
    rerender();

    expect(result.current.selectedSeasonId).toBe('picked-season');
  });

  // With no bracket in the link there is nothing better coming, so the default
  // season is the answer and belongs in the address as before.
  it('still writes the default season to the address when no bracket is linked', () => {
    const { result } = renderHook(() => usePlayoffPageData());

    expect(result.current.selectedSeasonId).toBe('current-season');
    expect(searchParams.get('season')).toBe('current-season');
  });
});
