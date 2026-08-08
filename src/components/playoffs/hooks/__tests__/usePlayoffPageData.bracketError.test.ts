import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// A failed selected-bracket fetch used to vanish: the query's error was
// destructured as `_selectedBracketError` and never returned, so `ready` simply
// stayed false and the page fell back to the bracket list with no explanation.
const bracketQueryRef = {
  current: {
    data: null as unknown,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
};

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
  useSearchParams: () => [new URLSearchParams('bracket=bracket-1'), vi.fn()] as const,
}));

vi.mock('@/hooks/useSeasons', () => ({
  useActiveSeason: () => ({ data: { id: 'season-1' } }),
  usePlayoffActiveSeason: () => ({ data: null }),
}));

vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdminAccessGranted: false, isLoading: false }),
}));

vi.mock('@/hooks/useDivisions', () => ({
  useDivisions: () => ({ divisions: [], isLoading: false, error: null }),
}));

vi.mock('@/hooks/brackets/useBracketData', () => ({
  useBracketData: () => bracketQueryRef.current,
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

describe('usePlayoffPageData selected-bracket errors', () => {
  it('exposes the failure as a string so the page can render it', () => {
    const refetch = vi.fn();
    bracketQueryRef.current = {
      data: null,
      isLoading: false,
      error: new Error('bracket fetch exploded'),
      refetch,
    };

    const { result } = renderHook(() => usePlayoffPageData());

    expect(result.current.selectedBracketError).toBe('bracket fetch exploded');
    // The bracket stays selected, which is exactly why the error must be visible.
    expect(result.current.selectedBracketId).toBe('bracket-1');
    expect(result.current.ready).toBe(false);
  });

  it('retrySelectedBracket refetches the failed query', () => {
    // react-query's refetch returns a promise, and retrySelectedBracket chains
    // .catch() onto it — a bare vi.fn() returning undefined would throw.
    const refetch = vi.fn().mockResolvedValue(undefined);
    bracketQueryRef.current = {
      data: null,
      isLoading: false,
      error: new Error('nope'),
      refetch,
    };

    const { result } = renderHook(() => usePlayoffPageData());
    result.current.retrySelectedBracket();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('reports no error when the bracket loads', () => {
    bracketQueryRef.current = {
      data: { id: 'bracket-1' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    const { result } = renderHook(() => usePlayoffPageData());

    expect(result.current.selectedBracketError).toBeNull();
    expect(result.current.ready).toBe(true);
  });
});
