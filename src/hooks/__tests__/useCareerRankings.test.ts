import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseTeamsQuery = vi.fn();
const mockUseQuery = vi.fn();

vi.mock('@/hooks/teams', () => ({
  useTeamsQuery: (options: unknown) => mockUseTeamsQuery(options),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

vi.mock('./career/computeAllTeamsTotals', () => ({
  computeAllTeamsTotals: vi.fn(),
}));

import { useCareerRankings } from '../useCareerRankings';

describe('useCareerRankings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  // Raised in review of the B-36 fix: the rankings query is disabled until the
  // team list arrives, so it can never report the team fetch's own failure. Its
  // error stayed null and its data stayed undefined, which every consumer read
  // as an empty league — the report card and the GPA leaderboard both said
  // "not enough data" when the request had in fact failed.
  it('reports the team fetch failure that disables its own query', () => {
    const teamsError = new Error('teams down');
    mockUseTeamsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: teamsError,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useCareerRankings());

    expect(result.current.error).toBe(teamsError);
    // The query it wraps saw nothing at all.
    expect(mockUseQuery.mock.calls[0][0].enabled).toBe(false);
  });

  it('retries the team query, not only its own', async () => {
    const refetchTeams = vi.fn().mockResolvedValue({});
    const refetchQuery = vi.fn().mockResolvedValue({});
    mockUseTeamsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('teams down'),
      refetch: refetchTeams,
    });
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: refetchQuery,
    });

    const { result } = renderHook(() => useCareerRankings());
    await result.current.refetch();

    // Retrying only its own query could never recover: that query is disabled
    // until the team list is back.
    expect(refetchTeams).toHaveBeenCalled();
  });

  it('is still loading while its prerequisite is', () => {
    mockUseTeamsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useCareerRankings());

    // A disabled query reports isLoading false, which read as "loaded, empty"
    // and flashed the no-data message while the teams were still arriving.
    expect(result.current.isLoading).toBe(true);
  });

  it('passes its own error through when the team list is fine', () => {
    const queryError = new Error('rankings down');
    mockUseTeamsQuery.mockReturnValue({
      data: [{ id: 't1' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: queryError,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useCareerRankings());

    expect(result.current.error).toBe(queryError);
  });
});
