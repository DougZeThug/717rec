import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMatchSubmission } from '../useMatchSubmission';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const { mockUpdateTeamStats } = vi.hoisted(() => ({
  mockUpdateTeamStats: vi.fn(),
}));

vi.mock('../useTeamRecordUpdate', () => ({
  useTeamRecordUpdate: () => ({
    updateTeamStats: mockUpdateTeamStats,
  }),
}));

vi.mock('../utils/matchDatabaseUtils', () => ({
  updateMatchScore: vi.fn(),
}));

vi.mock('../utils/queryCacheUtils', () => ({
  invalidateMatchRelatedQueries: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../validation/useScoreValidation', () => ({
  useScoreValidation: () => ({
    validateScore: vi.fn().mockReturnValue({ isValid: true }),
    validateMatch: vi.fn().mockReturnValue(true),
  }),
}));

vi.mock('@/utils/logger', () => ({
  matchLog: vi.fn(),
  warnLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { updateMatchScore, type UpdateMatchScoreResult } from '../utils/matchDatabaseUtils';
import { invalidateMatchRelatedQueries } from '../utils/queryCacheUtils';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
  return Wrapper;
};

describe('useMatchSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: team stats update succeeds (matches existing tests' assumptions)
    mockUpdateTeamStats.mockResolvedValue(true);
  });

  it('returns handleSubmitScore function', () => {
    const { result } = renderHook(() => useMatchSubmission(), { wrapper: createWrapper() });
    expect(result.current.handleSubmitScore).toBeDefined();
    expect(typeof result.current.handleSubmitScore).toBe('function');
  });

  it('successfully submits match score', async () => {
    const mockResult = {
      data: { id: 'match-1', team1_score: 2, team2_score: 1 },
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1Win: true,
    };
    vi.mocked(updateMatchScore).mockResolvedValue(mockResult as unknown as UpdateMatchScoreResult);

    const { result } = renderHook(() => useMatchSubmission(), { wrapper: createWrapper() });

    const success = await result.current.handleSubmitScore({
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 3,
      team2GameWins: 1,
    });

    expect(success).toBe(true);
    expect(updateMatchScore).toHaveBeenCalledWith({
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 3,
      team2GameWins: 1,
    });
  });

  it('determines winner correctly when team1 wins', async () => {
    const mockResult = {
      data: { id: 'match-1' },
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1Win: true,
    };
    vi.mocked(updateMatchScore).mockResolvedValue(mockResult as unknown as UpdateMatchScoreResult);

    const { result } = renderHook(() => useMatchSubmission(), { wrapper: createWrapper() });

    await result.current.handleSubmitScore({
      matchId: 'match-1',
      team1Score: 3,
      team2Score: 1,
    });

    expect(updateMatchScore).toHaveBeenCalled();
  });

  it('determines winner correctly when team2 wins', async () => {
    const mockResult = {
      data: { id: 'match-1' },
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1Win: false,
    };
    vi.mocked(updateMatchScore).mockResolvedValue(mockResult as unknown as UpdateMatchScoreResult);

    const { result } = renderHook(() => useMatchSubmission(), { wrapper: createWrapper() });

    await result.current.handleSubmitScore({
      matchId: 'match-1',
      team1Score: 1,
      team2Score: 3,
    });

    expect(updateMatchScore).toHaveBeenCalled();
  });

  it('invalidates query cache after successful submission', async () => {
    const mockResult = {
      data: { id: 'match-1' },
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1Win: true,
    };
    vi.mocked(updateMatchScore).mockResolvedValue(mockResult as unknown as UpdateMatchScoreResult);

    const { result } = renderHook(() => useMatchSubmission(), { wrapper: createWrapper() });

    await result.current.handleSubmitScore({
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
    });

    expect(invalidateMatchRelatedQueries).toHaveBeenCalled();
  });

  it('returns false on error', async () => {
    vi.mocked(updateMatchScore).mockRejectedValue(new Error('Database error'));

    const { result } = renderHook(() => useMatchSubmission(), { wrapper: createWrapper() });

    const success = await result.current.handleSubmitScore({
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
    });

    expect(success).toBe(false);
  });

  it('returns false and skips success path when team stats update fails', async () => {
    const mockResult = {
      data: { id: 'match-1' },
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1Win: true,
    };
    vi.mocked(updateMatchScore).mockResolvedValue(mockResult as unknown as UpdateMatchScoreResult);
    // Simulate a team-records update failure (e.g. RPC/DB error converted to false)
    mockUpdateTeamStats.mockResolvedValueOnce(false);

    const { result } = renderHook(() => useMatchSubmission(), { wrapper: createWrapper() });

    const success = await result.current.handleSubmitScore({
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
    });

    // Must report failure so callers (e.g. Mass Score Entry) don't mark it submitted
    expect(success).toBe(false);
    // Should short-circuit before invalidating caches / showing the success toast
    expect(invalidateMatchRelatedQueries).not.toHaveBeenCalled();
  });

  it('parses game wins as integers', async () => {
    const mockResult = {
      data: { id: 'match-1' },
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1Win: true,
    };
    vi.mocked(updateMatchScore).mockResolvedValue(mockResult as unknown as UpdateMatchScoreResult);

    const { result } = renderHook(() => useMatchSubmission(), { wrapper: createWrapper() });

    await result.current.handleSubmitScore({
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: '3' as any,
      team2GameWins: '1' as any,
    });

    expect(updateMatchScore).toHaveBeenCalledWith(
      expect.objectContaining({
        team1GameWins: 3,
        team2GameWins: 1,
      })
    );
  });

  it('defaults game wins to 0 when not provided', async () => {
    const mockResult = {
      data: { id: 'match-1' },
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1Win: true,
    };
    vi.mocked(updateMatchScore).mockResolvedValue(mockResult as unknown as UpdateMatchScoreResult);

    const { result } = renderHook(() => useMatchSubmission(), { wrapper: createWrapper() });

    await result.current.handleSubmitScore({
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
    });

    expect(updateMatchScore).toHaveBeenCalledWith(
      expect.objectContaining({
        team1GameWins: 0,
        team2GameWins: 0,
      })
    );
  });

  it('allows concurrent submissions for different match IDs', async () => {
    vi.mocked(updateMatchScore).mockImplementation(
      async ({ matchId }) =>
        ({
          data: { id: matchId },
          team1_id: 'team-1',
          team2_id: 'team-2',
          team1Win: true,
        }) as unknown as UpdateMatchScoreResult
    );

    const { result } = renderHook(() => useMatchSubmission(), { wrapper: createWrapper() });

    const results = await Promise.all([
      result.current.handleSubmitScore({ matchId: 'm1', team1Score: 2, team2Score: 1 }),
      result.current.handleSubmitScore({ matchId: 'm2', team1Score: 2, team2Score: 1 }),
      result.current.handleSubmitScore({ matchId: 'm3', team1Score: 2, team2Score: 1 }),
    ]);

    expect(results).toEqual([true, true, true]);
    expect(updateMatchScore).toHaveBeenCalledTimes(3);
  });

  it('blocks duplicate concurrent submissions for the same match ID', async () => {
    let resolveFirst: (value: any) => void;
    const pending = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    vi.mocked(updateMatchScore).mockImplementationOnce(() => pending as any);

    const { result } = renderHook(() => useMatchSubmission(), { wrapper: createWrapper() });

    const first = result.current.handleSubmitScore({
      matchId: 'same-match',
      team1Score: 2,
      team2Score: 1,
    });
    const secondImmediate = await result.current.handleSubmitScore({
      matchId: 'same-match',
      team1Score: 2,
      team2Score: 1,
    });

    expect(secondImmediate).toBe(false);
    expect(updateMatchScore).toHaveBeenCalledTimes(1);

    resolveFirst!({
      data: { id: 'same-match' },
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1Win: true,
    });
    await first;

    vi.mocked(updateMatchScore).mockResolvedValueOnce({
      data: { id: 'same-match' },
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1Win: true,
    } as unknown as UpdateMatchScoreResult);

    const third = await result.current.handleSubmitScore({
      matchId: 'same-match',
      team1Score: 3,
      team2Score: 1,
    });
    expect(third).toBe(true);
    expect(updateMatchScore).toHaveBeenCalledTimes(2);
  });
});
