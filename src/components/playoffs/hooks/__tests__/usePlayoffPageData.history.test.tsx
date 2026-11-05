import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { type InitialEntry, MemoryRouter, useLocation, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// "Back to brackets" depends on how the router keeps history entries and their
// state. The other suites mock the router, so they would not notice if a router
// upgrade changed that. This one runs the hook inside a real MemoryRouter and
// reads the real location after each step.
const { queryClient } = vi.hoisted(() => ({
  queryClient: { prefetchQuery: vi.fn() },
}));

// Each test sets these once. The hook sees the same objects on every render,
// as it would from a settled query.
const playoffSeasonRef = { current: null as null | { id: string } };
const activeSeasonRef = { current: null as null | { id: string } };
const bracketRef = { current: null as null | { id: string; seasonId: string } };

vi.mock('@tanstack/react-query', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return { ...actual, useQueryClient: () => queryClient };
});

vi.mock('@/hooks/useSeasons', () => ({
  useActiveSeason: () => ({ data: activeSeasonRef.current }),
  usePlayoffActiveSeason: () => ({ data: playoffSeasonRef.current }),
}));

vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdminAccessGranted: true, isLoading: false }),
}));

vi.mock('@/hooks/useDivisions', () => ({
  useDivisions: () => ({ divisions: [], isLoading: false, error: null }),
}));

vi.mock('@/hooks/brackets/useBracketData', () => ({
  useBracketData: () => ({
    data: bracketRef.current,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/playoffs/usePlayoffTeams', () => ({
  usePlayoffTeams: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/usePlayoffViewModel.compat', () => ({
  usePlayoffData: () => ({
    bracketsLoading: false,
    teamsByDivision: {},
    bracketsByDivision: {},
    handleBracketCreated: vi.fn(),
    handleTeamDivisionChange: vi.fn(),
    refetchBrackets: vi.fn(),
    error: null,
  }),
}));

vi.mock('@/services/brackets/BracketWriteService', () => ({
  deleteBracket: vi.fn(),
}));

import { usePlayoffPageData } from '../usePlayoffPageData';

/** The page hook, plus what a reader of the address bar and the Back button would see. */
const renderAt = (entry: InitialEntry) =>
  renderHook(
    () => ({
      page: usePlayoffPageData(),
      location: useLocation(),
      navigate: useNavigate(),
    }),
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
      ),
    }
  );

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  queryClient.prefetchQuery.mockImplementation(() => Promise.resolve());
  playoffSeasonRef.current = null;
  activeSeasonRef.current = null;
  bracketRef.current = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePlayoffPageData history, with the real router', () => {
  it('opens a bracket with the list mark, and "Back to brackets" returns to the list', async () => {
    const { result } = renderAt('/playoffs?season=s-1');

    act(() => result.current.page.setSelectedBracketId('b-1'));

    await waitFor(() => expect(result.current.location.search).toBe('?season=s-1&bracket=b-1'));
    expect(result.current.location.state).toEqual({ fromList: true });

    act(() => result.current.page.closeBracket());

    await waitFor(() => expect(result.current.location.search).toBe('?season=s-1'));
    expect(result.current.location.pathname).toBe('/playoffs');
    expect(result.current.location.state).toBeNull();
    expect(result.current.page.selectedBracketId).toBeNull();

    // A real step back leaves the bracket entry ahead of the reader. A swap in
    // place would leave nothing to go forward to.
    await act(async () => {
      await result.current.navigate(1);
    });
    await waitFor(() => expect(result.current.location.search).toBe('?season=s-1&bracket=b-1'));
    expect(result.current.location.state).toEqual({ fromList: true });
    expect(result.current.page.selectedBracketId).toBe('b-1');
  });

  // A bracket opened from a list that shows over another bracket's address is
  // not marked, so closing it swaps the entry in place. The b-1 entry must still
  // be behind it: going back once more lands there.
  it('swaps in place, and keeps the earlier entry, when the bracket was opened over another', async () => {
    const { result } = renderAt('/playoffs?season=s-1');

    act(() => result.current.page.setSelectedBracketId('b-1'));
    await waitFor(() => expect(result.current.location.search).toBe('?season=s-1&bracket=b-1'));

    act(() => result.current.page.setSelectedBracketId('b-2'));
    await waitFor(() => expect(result.current.location.search).toBe('?season=s-1&bracket=b-2'));
    expect(result.current.location.state).toBeNull();

    act(() => result.current.page.closeBracket());
    await waitFor(() => expect(result.current.location.search).toBe('?season=s-1'));
    expect(result.current.page.selectedBracketId).toBeNull();

    await act(async () => {
      await result.current.navigate(-1);
    });
    await waitFor(() => expect(result.current.location.search).toBe('?season=s-1&bracket=b-1'));
    expect(result.current.location.state).toEqual({ fromList: true });
  });

  it('swaps in place when the link opened straight on a bracket', async () => {
    const { result } = renderAt('/playoffs?season=s-1&bracket=b-1');
    expect(result.current.page.selectedBracketId).toBe('b-1');

    act(() => result.current.page.closeBracket());

    await waitFor(() => expect(result.current.location.search).toBe('?season=s-1'));
    expect(result.current.page.selectedBracketId).toBeNull();

    // It was the only entry. A push would leave the bracket address behind it.
    await act(async () => {
      await result.current.navigate(-1);
    });
    expect(result.current.location.search).toBe('?season=s-1');
  });

  // Writing the season into the address swaps the entry. The swap has to carry
  // the state over, or the list mark is lost and "Back to brackets" cannot go back.
  it('keeps the list mark when the season is written into the address', async () => {
    playoffSeasonRef.current = { id: 's-1' };
    activeSeasonRef.current = { id: 's-1' };
    bracketRef.current = { id: 'b-1', seasonId: 's-1' };

    const { result } = renderAt({
      pathname: '/playoffs',
      search: '?bracket=b-1',
      state: { fromList: true },
    });

    await waitFor(() =>
      expect(new URLSearchParams(result.current.location.search).get('season')).toBe('s-1')
    );
    expect(new URLSearchParams(result.current.location.search).get('bracket')).toBe('b-1');
    expect(result.current.location.state).toEqual({ fromList: true });
  });
});
