import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock all hook dependencies imported by usePlayoffPageData. We only care
// about the season-default effect, so the rest are no-op stubs.
const playoffSeasonRef = { current: undefined as undefined | null | { id: string } };
const activeSeasonRef = { current: undefined as undefined | null | { id: string } };

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query'
  );
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
      removeQueries: vi.fn(),
      prefetchQuery: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

vi.mock('react-router', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()] as const,
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
  useBracketData: () => ({ data: null, isLoading: false, error: null, refetch: vi.fn() }),
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
    refetchBrackets: vi.fn().mockResolvedValue(undefined),
    error: null,
  }),
}));

vi.mock('@/services/brackets/BracketWriteService', () => ({
  deleteBracket: vi.fn(),
}));

import { usePlayoffPageData } from '../usePlayoffPageData';

describe('usePlayoffPageData season default selection', () => {
  it('does NOT settle on activeSeason if playoffSeason is still loading (race regression)', () => {
    activeSeasonRef.current = { id: 'active-1' };
    playoffSeasonRef.current = undefined; // still loading

    const { result, rerender } = renderHook(() => usePlayoffPageData());
    expect(result.current.selectedSeasonId).toBeNull();

    // Now playoffSeason resolves
    playoffSeasonRef.current = { id: 'playoff-1' };
    rerender();

    expect(result.current.selectedSeasonId).toBe('playoff-1');
  });

  it('falls back to activeSeason when no playoff is in progress', () => {
    activeSeasonRef.current = { id: 'active-2' };
    playoffSeasonRef.current = null;

    const { result } = renderHook(() => usePlayoffPageData());
    expect(result.current.selectedSeasonId).toBe('active-2');
  });

  it('prefers playoffSeason when both are already cached on first render', () => {
    activeSeasonRef.current = { id: 'active-3' };
    playoffSeasonRef.current = { id: 'playoff-3' };

    const { result } = renderHook(() => usePlayoffPageData());
    expect(result.current.selectedSeasonId).toBe('playoff-3');
  });
});
