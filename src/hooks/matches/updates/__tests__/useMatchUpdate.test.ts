import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMatchUpdate } from '../useMatchUpdate';

const mockToast = vi.fn();
const mockUpdateTeamRecords = vi.fn();
const mockInvalidateAllDataQueries = vi.fn();
const mockReverseTeamStats = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/useTeamRecords', () => ({
  useTeamRecords: () => ({ updateTeamRecords: mockUpdateTeamRecords }),
}));

vi.mock('@/services/matches/MatchWriteService', () => ({
  updateMatch: vi.fn(),
  upsertTeamSeasonStats: vi.fn(),
}));

vi.mock('../utils/queryInvalidation', () => ({
  invalidateAllDataQueries: (...args: unknown[]) => mockInvalidateAllDataQueries(...args),
}));

vi.mock('../utils/statReversalUtils', () => ({
  reverseTeamStats: (...args: unknown[]) => mockReverseTeamStats(...args),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

import { updateMatch, upsertTeamSeasonStats } from '@/services/matches/MatchWriteService';

const baseMatch = {
  id: 'match-1',
  team1Id: 'team-1',
  team2Id: 'team-2',
  date: '2026-04-20',
  location: 'Main Lanes',
  iscompleted: true,
  team1Score: 3,
  team2Score: 1,
  winnerId: 'team-1',
  loserId: 'team-2',
  team1_game_wins: 3,
  team2_game_wins: 1,
} as any;

const createWrapper = (queryClient: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useMatchUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateTeamRecords.mockResolvedValue(true);
    vi.mocked(updateMatch).mockResolvedValue({
      id: 'match-1',
      team1_id: 'team-1',
      team2_id: 'team-2',
      date: '2026-04-20',
      location: 'Main Lanes',
      iscompleted: true,
      team1_score: 2,
      team2_score: 1,
      winner_id: 'team-1',
      loser_id: 'team-2',
      team1_game_wins: 2,
      team2_game_wins: 1,
      round_number: null,
      position: null,
      bracket_id: null,
      match_type: null,
      next_match_id: null,
      next_loser_match_id: null,
      best_of: null,
      created_at: '2026-04-20T00:00:00Z',
    } as any);
    vi.mocked(upsertTeamSeasonStats).mockResolvedValue(undefined as any);
  });

  it('updates match, syncs team records, and invalidates caches', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const setMatches = vi.fn();
    const setEditingMatch = vi.fn();

    const { result } = renderHook(
      () =>
        useMatchUpdate({
          matches: [baseMatch],
          setMatches,
          editingMatch: baseMatch,
          setEditingMatch,
        }),
      { wrapper: createWrapper(queryClient) }
    );

    const ok = await act(async () =>
      result.current.handleUpdateMatch(
        {
          ...baseMatch,
          team1_game_wins: 2,
          team2_game_wins: 1,
        },
        []
      )
    );

    expect(ok).toBe(true);
    expect(updateMatch).toHaveBeenCalledWith(
      'match-1',
      expect.objectContaining({ team1_id: 'team-1', winner_id: 'team-1' })
    );
    expect(mockUpdateTeamRecords).toHaveBeenCalled();
    expect(mockInvalidateAllDataQueries).toHaveBeenCalled();
    expect(setMatches).toHaveBeenCalled();
    expect(setEditingMatch).toHaveBeenCalledWith(undefined);
  });

  it('surfaces update service errors via toast and returns false', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(updateMatch).mockRejectedValue(new Error('db write failed'));

    const { result } = renderHook(
      () =>
        useMatchUpdate({
          matches: [baseMatch],
          setMatches: vi.fn(),
          editingMatch: baseMatch,
          setEditingMatch: vi.fn(),
        }),
      { wrapper: createWrapper(queryClient) }
    );

    const success = await act(async () =>
      result.current.handleUpdateMatch({ ...baseMatch, team1_game_wins: 4, team2_game_wins: 0 }, [])
    );

    expect(success).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: 'Failed to update match: db write failed',
        variant: 'destructive',
      })
    );
  });

  it('rolls back old team stats when completed match becomes incomplete', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(
      () =>
        useMatchUpdate({
          matches: [baseMatch],
          setMatches: vi.fn(),
          editingMatch: baseMatch,
          setEditingMatch: vi.fn(),
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await act(async () => {
      await result.current.handleUpdateMatch(
        {
          ...baseMatch,
          iscompleted: false,
          winnerId: undefined,
          loserId: undefined,
        },
        []
      );
    });

    expect(mockReverseTeamStats).toHaveBeenCalledWith('team-1', 'team-2', 3, 1);
  });

  it('handles partial failure by reconciling and returning false', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockUpdateTeamRecords.mockResolvedValue(false);

    const { result } = renderHook(
      () =>
        useMatchUpdate({
          matches: [baseMatch],
          setMatches: vi.fn(),
          editingMatch: baseMatch,
          setEditingMatch: vi.fn(),
        }),
      { wrapper: createWrapper(queryClient) }
    );

    const success = await act(async () =>
      result.current.handleUpdateMatch({ ...baseMatch, team1_game_wins: 4, team2_game_wins: 0 }, [])
    );

    expect(success).toBe(false);
    expect(upsertTeamSeasonStats).toHaveBeenCalled();
    expect(mockInvalidateAllDataQueries).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Partial Failure (Auto-Recovered)', variant: 'destructive' })
    );
  });
});
