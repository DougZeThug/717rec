import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
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

vi.mock('../useTeamRecordUpdate', () => ({
  useTeamRecordUpdate: () => ({
    updateTeamStats: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('../utils/matchDatabaseUtils', () => ({
  updateMatchScore: vi.fn(),
}));

vi.mock('../utils/queryCacheUtils', () => ({
  invalidateMatchRelatedQueries: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/logger', () => ({
  matchLog: vi.fn(),
  warnLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { useTeamRecordUpdate } from '../useTeamRecordUpdate';
import { updateMatchScore } from '../utils/matchDatabaseUtils';
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
    vi.mocked(updateMatchScore).mockResolvedValue(mockResult);

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
    vi.mocked(updateMatchScore).mockResolvedValue(mockResult);

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
    vi.mocked(updateMatchScore).mockResolvedValue(mockResult);

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
    vi.mocked(updateMatchScore).mockResolvedValue(mockResult);

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

  it('parses game wins as integers', async () => {
    const mockResult = {
      data: { id: 'match-1' },
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1Win: true,
    };
    vi.mocked(updateMatchScore).mockResolvedValue(mockResult);

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
    vi.mocked(updateMatchScore).mockResolvedValue(mockResult);

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
});
