import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockToast = vi.fn();
const mockUpdateTeamRecords = vi.fn();
const mockReverseTeamStats = vi.fn();
const mockInvalidateAllDataQueries = vi.fn();

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

vi.mock('../utils/statReversalUtils', () => ({
  reverseTeamStats: (...args: unknown[]) => mockReverseTeamStats(...args),
}));

vi.mock('../utils/queryInvalidation', () => ({
  invalidateAllDataQueries: (...args: unknown[]) => mockInvalidateAllDataQueries(...args),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

import { updateMatch } from '@/services/matches/MatchWriteService';

import { useMatchUpdate } from '../useMatchUpdate';

const wrapperWithClient = (queryClient: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

const baseMatch = {
  id: 'm1',
  team1Id: 't1',
  team2Id: 't2',
  date: '2026-04-10',
  location: 'Gym',
  iscompleted: false,
  team1Score: 0,
  team2Score: 0,
  winnerId: undefined,
  loserId: undefined,
  team1_game_wins: 0,
  team2_game_wins: 0,
};

describe('useMatchUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateTeamRecords.mockResolvedValue(true);
  });

  it('updates match, closes editor, and invalidates caches', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const setMatches = vi.fn();
    const setEditingMatch = vi.fn();

    vi.mocked(updateMatch).mockResolvedValue({
      id: 'm1',
      team1_id: 't1',
      team2_id: 't2',
      date: '2026-04-10',
      location: 'Gym',
      iscompleted: true,
      team1_score: 2,
      team2_score: 1,
      winner_id: 't1',
      loser_id: 't2',
      team1_game_wins: 2,
      team2_game_wins: 1,
      round_number: null,
      position: null,
      bracket_id: null,
      match_type: null,
      next_match_id: null,
      next_loser_match_id: null,
      best_of: null,
      created_at: '2026-04-10T00:00:00Z',
    } as any);

    const { result } = renderHook(
      () =>
        useMatchUpdate({
          matches: [baseMatch as any],
          setMatches,
          editingMatch: baseMatch as any,
          setEditingMatch,
        }),
      { wrapper: wrapperWithClient(queryClient) }
    );

    const success = await result.current.handleUpdateMatch(
      {
        ...baseMatch,
        iscompleted: true,
        team1Score: 2,
        team2Score: 1,
        winnerId: 't1',
        loserId: 't2',
        team1_game_wins: 2,
        team2_game_wins: 1,
      } as any,
      [] as any
    );

    expect(success).toBe(true);
    expect(setMatches).toHaveBeenCalled();
    expect(setEditingMatch).toHaveBeenCalledWith(undefined);
    expect(mockInvalidateAllDataQueries).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Match Updated' })
    );
  });

  it('returns false and toasts when service update fails', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    vi.mocked(updateMatch).mockRejectedValue(new Error('write failed'));

    const { result } = renderHook(
      () =>
        useMatchUpdate({
          matches: [baseMatch as any],
          setMatches: vi.fn(),
          editingMatch: baseMatch as any,
          setEditingMatch: vi.fn(),
        }),
      { wrapper: wrapperWithClient(queryClient) }
    );

    const ok = await result.current.handleUpdateMatch(baseMatch as any, [] as any);

    expect(ok).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Error', description: expect.stringContaining('write failed') })
    );
  });

  it('reverses previous stats before applying changed completed result', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

    const editingMatch = {
      ...baseMatch,
      iscompleted: true,
      winnerId: 't1',
      loserId: 't2',
      team1_game_wins: 2,
      team2_game_wins: 0,
    };

    vi.mocked(updateMatch).mockResolvedValue({
      id: 'm1',
      team1_id: 't1',
      team2_id: 't2',
      date: '2026-04-10',
      location: 'Gym',
      iscompleted: true,
      team1_score: 1,
      team2_score: 2,
      winner_id: 't2',
      loser_id: 't1',
      team1_game_wins: 1,
      team2_game_wins: 2,
    } as any);

    const { result } = renderHook(
      () =>
        useMatchUpdate({
          matches: [editingMatch as any],
          setMatches: vi.fn(),
          editingMatch: editingMatch as any,
          setEditingMatch: vi.fn(),
        }),
      { wrapper: wrapperWithClient(queryClient) }
    );

    await act(async () => {
      await result.current.handleUpdateMatch(
        {
          ...editingMatch,
          winnerId: 't2',
          loserId: 't1',
          team1_game_wins: 1,
          team2_game_wins: 2,
          iscompleted: true,
        } as any,
        [] as any
      );
    });

    expect(mockReverseTeamStats).toHaveBeenCalledWith('t1', 't2', 2, 0);
    expect(mockUpdateTeamRecords).toHaveBeenCalledWith('t2', 't1', [], 2, 1);
  });
});
