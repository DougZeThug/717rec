import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BRACKET_FORMATS, BRACKET_STATES } from '@/constants/brackets';

// The actions the page hands its children: opening and closing a bracket,
// deleting one, and the division and bracket lists it derives for them.
const {
  queryClient,
  deleteBracketService,
  originalRefetchBrackets,
  refetchSelectedBracket,
  errorLog,
} = vi.hoisted(() => ({
  // One client for every render, so a test can check the calls made on it.
  queryClient: {
    invalidateQueries: vi.fn(),
    removeQueries: vi.fn(),
    prefetchQuery: vi.fn(),
  },
  deleteBracketService: vi.fn(),
  // The data layer's refresh of the bracket lists, and the open bracket's own refetch.
  originalRefetchBrackets: vi.fn(),
  refetchSelectedBracket: vi.fn(),
  // The app's error log, so a test can see what the page reported.
  errorLog: vi.fn(),
}));

/** The address bar, shared by the hook and the assertions. */
let searchParams = new URLSearchParams();
// The second argument is typed so a test can read it: `{ replace: true }` swaps
// the current history entry, no argument pushes a new one. `state` is what the
// new entry carries.
const setSearchParams = vi.fn<
  (next: URLSearchParams, options?: { replace?: boolean; state?: unknown }) => void
>((next) => {
  searchParams = new URLSearchParams(next);
});
/** The history entry the page is on. `state` holds the "opened from the list" mark. */
const currentLocation: { state: unknown } = { state: null };
/** Called with `-1` for one step back in the browser history. */
const navigate = vi.fn();

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
  useLocation: () => currentLocation,
  useNavigate: () => navigate,
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
  useBracketData: () => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: refetchSelectedBracket,
  }),
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
    refetchBrackets: originalRefetchBrackets,
    error: null,
  }),
}));

vi.mock('@/utils/logger', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/logger')>()),
  errorLog,
}));

vi.mock('@/services/brackets/BracketWriteService', () => ({
  deleteBracket: deleteBracketService,
}));

import { ValidationError } from '@/types/errors';

import { usePlayoffPageData } from '../usePlayoffPageData';

beforeEach(() => {
  searchParams = new URLSearchParams();
  currentLocation.state = null;
  divisionsRef.current = [];
  bracketsByDivisionRef.current = {};
  queryClient.invalidateQueries.mockImplementation(() => Promise.resolve());
  queryClient.prefetchQuery.mockImplementation(() => Promise.resolve());
  deleteBracketService.mockImplementation(() => Promise.resolve());
  originalRefetchBrackets.mockImplementation(() => Promise.resolve());
  refetchSelectedBracket.mockImplementation(() => Promise.resolve());
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

  // Opening a bracket swaps a long division list for a short bracket page. A
  // reader who had scrolled the list would otherwise land part way down it.
  it('scrolls to the top when a bracket opens', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const { result } = renderHook(() => usePlayoffPageData());

    act(() => result.current.setSelectedBracketId('b-1'));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    scrollTo.mockRestore();
  });

  it('leaves the scroll position alone when a bracket closes', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    searchParams = new URLSearchParams('bracket=b-1');
    const { result } = renderHook(() => usePlayoffPageData());

    act(() => result.current.setSelectedBracketId(null));

    expect(scrollTo).not.toHaveBeenCalled();
    scrollTo.mockRestore();
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

  // Opening a bracket is a step forward, so it adds a history entry. Back then
  // returns the reader to the list.
  it('adds a history entry when a bracket opens', () => {
    const { result } = renderHook(() => usePlayoffPageData());

    act(() => result.current.setSelectedBracketId('b-1'));

    expect(setSearchParams).toHaveBeenCalledTimes(1);
    expect(setSearchParams.mock.lastCall?.[1]?.replace).toBeUndefined();
  });

  // The new entry is marked as opened from this page's own list. "Back to
  // brackets" reads the mark to step back to that list.
  it('marks the new history entry as opened from the list', () => {
    const { result } = renderHook(() => usePlayoffPageData());

    act(() => result.current.setSelectedBracketId('b-1'));

    expect(setSearchParams).toHaveBeenCalledTimes(1);
    expect(setSearchParams).toHaveBeenLastCalledWith(expect.any(URLSearchParams), {
      state: { fromList: true },
    });
  });

  // The list also shows over a `?bracket=` address, while a bracket loads or
  // fails. A tap there starts from a bracket entry, not the list. A mark on it
  // would send "Back to brackets" to that other bracket.
  it('does not mark the entry when the address already names a bracket', () => {
    searchParams = new URLSearchParams('bracket=b-1');
    const { result } = renderHook(() => usePlayoffPageData());

    act(() => result.current.setSelectedBracketId('b-2'));

    expect(setSearchParams).toHaveBeenCalledTimes(1);
    expect(searchParams.get('bracket')).toBe('b-2');
    const options = setSearchParams.mock.lastCall?.[1];
    expect(options?.state).toBeUndefined();
    expect(options?.replace).toBeUndefined();
  });

  // Closing swaps the entry instead. Otherwise the phone's Back button would
  // open the bracket the reader just closed.
  it('replaces the history entry when a bracket closes', () => {
    searchParams = new URLSearchParams('bracket=b-1');
    const { result } = renderHook(() => usePlayoffPageData());

    act(() => result.current.setSelectedBracketId(null));

    expect(setSearchParams).toHaveBeenCalledTimes(1);
    expect(setSearchParams).toHaveBeenLastCalledWith(expect.any(URLSearchParams), {
      replace: true,
    });
  });
});

describe('usePlayoffPageData closeBracket', () => {
  // The reader opened the bracket from the list on this page. The list is the
  // step just behind, so "Back to brackets" goes back to it. No second list step
  // is left for the Back button to land on.
  it('goes back one history step when the bracket was opened from the list', () => {
    searchParams = new URLSearchParams('bracket=b-1');
    currentLocation.state = { fromList: true };
    const { result } = renderHook(() => usePlayoffPageData());
    expect(result.current.selectedBracketId).toBe('b-1');

    act(() => result.current.closeBracket());

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(-1);
    expect(setSearchParams).not.toHaveBeenCalled();
    // The list shows at once, before the browser finishes the step back.
    expect(result.current.selectedBracketId).toBeNull();
  });

  // A shared link, a link made by an admin, or a bracket link that failed to
  // load: there is no list step behind the entry, so it is swapped in place.
  it('replaces the history entry when the bracket was not opened from the list', () => {
    searchParams = new URLSearchParams('bracket=b-1');
    const { result } = renderHook(() => usePlayoffPageData());

    act(() => result.current.closeBracket());

    expect(navigate).not.toHaveBeenCalled();
    expect(setSearchParams).toHaveBeenCalledTimes(1);
    expect(setSearchParams).toHaveBeenLastCalledWith(expect.any(URLSearchParams), {
      replace: true,
    });
    expect(result.current.selectedBracketId).toBeNull();
    expect(searchParams.has('bracket')).toBe(false);
  });

  it('only trusts the mark when it is exactly true', () => {
    searchParams = new URLSearchParams('bracket=b-1');
    currentLocation.state = { fromList: 'yes' };
    const { result } = renderHook(() => usePlayoffPageData());

    act(() => result.current.closeBracket());

    expect(navigate).not.toHaveBeenCalled();
    expect(setSearchParams).toHaveBeenLastCalledWith(expect.any(URLSearchParams), {
      replace: true,
    });
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

  // The deleted bracket no longer exists. Back must not return to its address.
  it('replaces the history entry when the open bracket is deleted', async () => {
    searchParams = new URLSearchParams('bracket=b-1');
    const { result } = renderHook(() => usePlayoffPageData());

    await act(() => result.current.deleteBracket('b-1', 'Gold'));

    expect(setSearchParams).toHaveBeenCalledTimes(1);
    expect(setSearchParams).toHaveBeenLastCalledWith(expect.any(URLSearchParams), {
      replace: true,
    });
  });

  // Going back would land on a list that still shows the deleted bracket. The
  // mark on the entry must not turn the delete into a step back.
  it('still replaces the history entry when the entry carries the list mark', async () => {
    searchParams = new URLSearchParams('bracket=b-1');
    currentLocation.state = { fromList: true };
    const { result } = renderHook(() => usePlayoffPageData());

    await act(() => result.current.deleteBracket('b-1', 'Gold'));

    expect(navigate).not.toHaveBeenCalled();
    expect(setSearchParams).toHaveBeenCalledTimes(1);
    expect(setSearchParams).toHaveBeenLastCalledWith(expect.any(URLSearchParams), {
      replace: true,
    });
    expect(result.current.selectedBracketId).toBeNull();
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

  // The division list comes from the network. If it is not a list, the page
  // shows no divisions instead of crashing, and nothing is logged as a fault.
  it('shows no divisions when the division data is not a list', () => {
    divisionsRef.current = null as unknown as typeof divisionsRef.current;

    const { result } = renderHook(() => usePlayoffPageData());

    expect(result.current.divisions).toEqual([]);
    expect(result.current.availableDivisions).toEqual([]);
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('shows no divisions, and logs the fault, when a division entry is broken', () => {
    divisionsRef.current = [
      { display_division: 'Gold' },
      null,
    ] as unknown as typeof divisionsRef.current;

    const { result } = renderHook(() => usePlayoffPageData());

    expect(result.current.availableDivisions).toEqual([]);
    expect(errorLog).toHaveBeenCalledTimes(1);
    // The whole call is compared, so the logger still gets exactly these three arguments.
    expect(vi.mocked(errorLog).mock.calls[0]).toEqual([
      'availableDivisions processing:',
      expect.any(TypeError),
      undefined,
    ]);
  });

  // One broken bracket must not take the page down. The divisions that could be
  // read stay, and the page shows a message so the problem is not silent.
  it('keeps the divisions it could read, reports the fault and logs it once', () => {
    bracketsByDivisionRef.current = {
      Silver: [{ id: 'b-2', name: 'Silver bracket' }],
      Gold: [null],
    };

    const { result, rerender } = renderHook(() => usePlayoffPageData());

    expect(result.current.error).toBe('Failed to process bracket data. Please try again.');
    expect(result.current.typesafeBracketsByDivision.Silver).toHaveLength(1);
    expect(result.current.typesafeBracketsByDivision).not.toHaveProperty('Gold');
    expect(errorLog).toHaveBeenCalledTimes(1);
    // The whole call is compared, so the logger still gets exactly these three arguments.
    expect(vi.mocked(errorLog).mock.calls[0]).toEqual([
      'typesafeBracketsByDivision processing:',
      expect.any(TypeError),
      undefined,
    ]);

    // The same data again is not a new fault, so it is not logged again.
    rerender();
    expect(errorLog).toHaveBeenCalledTimes(1);
  });

  it('drops the fault message once the bracket data is readable again', () => {
    bracketsByDivisionRef.current = { Gold: [null] };
    const { result, rerender } = renderHook(() => usePlayoffPageData());
    expect(result.current.error).toBe('Failed to process bracket data. Please try again.');

    bracketsByDivisionRef.current = { Gold: [{ id: 'b-1', name: 'Gold bracket' }] };
    rerender();

    expect(result.current.error).toBeNull();
    expect(result.current.typesafeBracketsByDivision.Gold).toHaveLength(1);
  });
});

describe('usePlayoffPageData refetchBrackets', () => {
  it('refreshes the lists, and leaves bracket data alone, when no bracket is open', async () => {
    const { result } = renderHook(() => usePlayoffPageData());

    await act(() => result.current.refetchBrackets());

    expect(originalRefetchBrackets).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['brackets'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['playoff-data'] });
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['bracket-data', expect.anything()],
    });
    expect(refetchSelectedBracket).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('also reloads the open bracket when one is open', async () => {
    searchParams = new URLSearchParams('bracket=b-1');
    const { result } = renderHook(() => usePlayoffPageData());

    await act(() => result.current.refetchBrackets());

    expect(originalRefetchBrackets).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['bracket-data', 'b-1'],
    });
    expect(refetchSelectedBracket).toHaveBeenCalledTimes(1);
  });
});
