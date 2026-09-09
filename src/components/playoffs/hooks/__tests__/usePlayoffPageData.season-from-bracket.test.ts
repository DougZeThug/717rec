import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Same stubs as the season-default suite, but the URL and the bracket query are
// controllable: this is about which season a link decides on.
const playoffSeasonRef = { current: undefined as undefined | null | { id: string } };
const activeSeasonRef = { current: undefined as undefined | null | { id: string } };
const bracketRef = {
  current: { data: null, isLoading: false, error: null } as {
    data: { id: string; seasonId?: string | null } | null;
    isLoading: boolean;
    error: unknown;
  },
};

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
  useBracketData: () => ({ ...bracketRef.current, refetch: vi.fn() }),
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
  searchParams = new URLSearchParams();
  playoffSeasonRef.current = { id: 'current-season' };
  activeSeasonRef.current = { id: 'current-season' };
  bracketRef.current = { data: null, isLoading: false, error: null };
});

describe('usePlayoffPageData season and the bracket in the URL', () => {
  // A link to a past bracket used to show that bracket under a picker reading
  // "Summer 2 2026 (Current)".
  it('takes the season from the bracket the link opens', () => {
    searchParams = new URLSearchParams('bracket=b-past');
    bracketRef.current = { data: null, isLoading: true, error: null };

    const { result, rerender } = renderHook(() => usePlayoffPageData());

    // Nothing is chosen while the bracket is still loading: choosing now would
    // show the current season for a moment and then change under the reader.
    expect(result.current.selectedSeasonId).toBeNull();

    bracketRef.current = {
      data: { id: 'b-past', seasonId: 'past-season' },
      isLoading: false,
      error: null,
    };
    rerender();

    expect(result.current.selectedSeasonId).toBe('past-season');
  });

  it('honours an explicit season in the address over the bracket', () => {
    searchParams = new URLSearchParams('bracket=b-past&season=chosen-season');
    bracketRef.current = {
      data: { id: 'b-past', seasonId: 'past-season' },
      isLoading: false,
      error: null,
    };

    const { result } = renderHook(() => usePlayoffPageData());

    expect(result.current.selectedSeasonId).toBe('chosen-season');
  });

  it('falls back to the usual default when the bracket cannot be read', () => {
    searchParams = new URLSearchParams('bracket=b-missing');
    bracketRef.current = { data: null, isLoading: false, error: new Error('gone') };

    const { result } = renderHook(() => usePlayoffPageData());

    expect(result.current.selectedSeasonId).toBe('current-season');
  });

  // A legacy bracket resolves to no data at all, so waiting for a season on it
  // would wait for ever.
  it('falls back when the bracket settles with no season on it', () => {
    searchParams = new URLSearchParams('bracket=b-legacy');
    bracketRef.current = { data: null, isLoading: false, error: null };

    const { result } = renderHook(() => usePlayoffPageData());

    expect(result.current.selectedSeasonId).toBe('current-season');
  });

  it('puts the season in the address without losing the bracket', () => {
    searchParams = new URLSearchParams('bracket=b-past');
    bracketRef.current = {
      data: { id: 'b-past', seasonId: 'past-season' },
      isLoading: false,
      error: null,
    };

    renderHook(() => usePlayoffPageData());

    expect(setSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams), { replace: true });
    expect(searchParams.get('season')).toBe('past-season');
    expect(searchParams.get('bracket')).toBe('b-past');
  });

  // Back and Forward change the address without remounting the page. Resolving
  // the season only while it was unset left the reader on the season they had
  // just navigated away from, and the address was rewritten to match it.
  it('follows the address when Back restores the previous season', () => {
    searchParams = new URLSearchParams('season=season-a');

    const { result, rerender } = renderHook(() => usePlayoffPageData());
    expect(result.current.selectedSeasonId).toBe('season-a');

    act(() => result.current.setSelectedSeasonId('season-b'));
    expect(result.current.selectedSeasonId).toBe('season-b');

    // Back: the address returns to the earlier season, the page stays mounted.
    searchParams = new URLSearchParams('season=season-a');
    rerender();

    expect(result.current.selectedSeasonId).toBe('season-a');
    expect(searchParams.get('season')).toBe('season-a');
  });

  // The same disagreement, the other way round: the bracket on screen belongs
  // to the season being left.
  it('closes the open bracket when the reader picks another season', () => {
    searchParams = new URLSearchParams('bracket=b-past&season=past-season');
    bracketRef.current = {
      data: { id: 'b-past', seasonId: 'past-season' },
      isLoading: false,
      error: null,
    };

    const { result } = renderHook(() => usePlayoffPageData());
    result.current.setSelectedSeasonId('other-season');

    expect(searchParams.get('season')).toBe('other-season');
    expect(searchParams.get('bracket')).toBeNull();
  });
});
