import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The page's manual `error` string used to be written only — both catch blocks
// called setError, nothing ever wrote null back. So one transient failure
// pinned a red banner to the page permanently: ErrorDisplay renders `data.error`
// with no retry and no dismiss control, while the data underneath refreshed
// correctly. A reload was the only way out, which no user would guess.
const playoffDataRef = {
  current: {
    handleBracketCreated: vi.fn(),
    refetchBrackets: vi.fn(),
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

// A bracket is selected, matching the reported scenario (`/playoffs?bracket=…`),
// so refetchBrackets takes the branch that also refetches the selected bracket.
vi.mock('react-router', () => ({
  useSearchParams: () => [new URLSearchParams('bracket=bracket-1'), vi.fn()] as const,
}));

vi.mock('@/hooks/useSeasons', () => ({
  useActiveSeason: () => ({ data: { id: 'season-1' } }),
  usePlayoffActiveSeason: () => ({ data: null }),
}));

vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdminAccessGranted: true, isLoading: false }),
}));

vi.mock('@/hooks/useDivisions', () => ({
  useDivisions: () => ({ divisions: [], isLoading: false, error: null }),
}));

vi.mock('@/hooks/brackets/useBracketData', () => ({
  useBracketData: () => ({
    data: { id: 'bracket-1' },
    isLoading: false,
    error: null,
    refetch: vi.fn().mockImplementation(() => Promise.resolve()),
  }),
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
    handleBracketCreated: playoffDataRef.current.handleBracketCreated,
    handleTeamDivisionChange: vi.fn(),
    refetchBrackets: playoffDataRef.current.refetchBrackets,
    error: null,
  }),
}));

vi.mock('@/services/brackets/BracketWriteService', () => ({
  deleteBracket: vi.fn(),
}));

import { usePlayoffPageData } from '../usePlayoffPageData';

describe('usePlayoffPageData stale error state', () => {
  beforeEach(() => {
    playoffDataRef.current.handleBracketCreated = vi.fn().mockResolvedValue(undefined);
    playoffDataRef.current.refetchBrackets = vi.fn().mockResolvedValue(undefined);
  });

  it('clears a refresh failure once the retry succeeds', async () => {
    playoffDataRef.current.refetchBrackets.mockRejectedValueOnce(new Error('Connection refused'));

    const { result } = renderHook(() => usePlayoffPageData());

    // refetchBrackets re-throws after recording the failure, so the caller
    // (PlayoffErrorBanners' retry handler) has to swallow it — as we do here.
    await act(async () => {
      await expect(result.current.refetchBrackets()).rejects.toThrow('Connection refused');
    });

    expect(result.current.error).toBe('Failed to refresh data: Connection refused');

    await act(async () => {
      await result.current.refetchBrackets();
    });

    expect(result.current.error).toBeNull();
  });

  it('still reports the failure when the retry fails too', async () => {
    playoffDataRef.current.refetchBrackets
      .mockRejectedValueOnce(new Error('first attempt'))
      .mockRejectedValueOnce(new Error('second attempt'));

    const { result } = renderHook(() => usePlayoffPageData());

    await act(async () => {
      await expect(result.current.refetchBrackets()).rejects.toThrow('first attempt');
    });
    expect(result.current.error).toBe('Failed to refresh data: first attempt');

    await act(async () => {
      await expect(result.current.refetchBrackets()).rejects.toThrow('second attempt');
    });

    // Clearing up front must not swallow a genuine repeat failure.
    expect(result.current.error).toBe('Failed to refresh data: second attempt');
  });

  it('clears a bracket-creation failure once the retry succeeds', async () => {
    playoffDataRef.current.handleBracketCreated.mockRejectedValueOnce(
      new Error('bracket already exists')
    );

    const { result } = renderHook(() => usePlayoffPageData());

    // handleBracketCreated swallows its own error, so the banner is the only
    // signal a user gets. The cast is needed because PlayoffPageData declares
    // it `() => void` even though the implementation is async.
    await act(async () => {
      await (result.current.handleBracketCreated() as unknown as Promise<void>);
    });

    expect(result.current.error).toBe('Failed to create bracket: bracket already exists');

    await act(async () => {
      await (result.current.handleBracketCreated() as unknown as Promise<void>);
    });

    expect(result.current.error).toBeNull();
  });
});
