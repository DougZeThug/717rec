import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTeamMatches } from '../useTeamMatches';

vi.mock('@/services/matches/MatchReadService', () => ({
  fetchTeamMatchesData: vi.fn(),
}));

import { fetchTeamMatchesData } from '@/services/matches/MatchReadService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'match-1',
  team1_id: 'team-a',
  team2_id: 'team-b',
  team1_score: 2,
  team2_score: 1,
  date: '2026-04-01T18:00:00Z',
  location: 'Lane 1',
  iscompleted: false,
  winner_id: null,
  loser_id: null,
  round_number: 1,
  position: 1,
  bracket_id: null,
  match_type: 'regular',
  next_match_id: null,
  next_loser_match_id: null,
  best_of: 3,
  created_at: '2026-03-01T00:00:00Z',
  team1_game_wins: 2,
  team2_game_wins: 1,
  team1: { id: 'team-a', name: 'Alpha' },
  team2: { id: 'team-b', name: 'Beta' },
  ...overrides,
});

describe('useTeamMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty arrays and no loading when teamId is undefined', () => {
    const teamId: string | undefined = undefined;
    const { result } = renderHook(() => useTeamMatches(teamId), {
      wrapper: createWrapper(),
    });
    expect(result.current.upcomingMatches).toEqual([]);
    expect(result.current.pastMatches).toEqual([]);
    expect(result.current.isLoadingMatches).toBe(false);
  });

  it('shows loading state while fetching', () => {
    (fetchTeamMatchesData as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(vi.fn()));
    const { result } = renderHook(() => useTeamMatches('team-a'), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoadingMatches).toBe(true);
  });

  it('splits completed and uncompleted matches correctly', async () => {
    (fetchTeamMatchesData as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeRow({ id: 'upcoming', iscompleted: false }),
      makeRow({ id: 'past', iscompleted: true }),
    ]);
    const { result } = renderHook(() => useTeamMatches('team-a'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoadingMatches).toBe(false));
    expect(result.current.upcomingMatches).toHaveLength(1);
    expect(result.current.upcomingMatches[0].id).toBe('upcoming');
    expect(result.current.pastMatches).toHaveLength(1);
    expect(result.current.pastMatches[0].id).toBe('past');
  });

  it('maps camelCase fields from snake_case DB rows', async () => {
    (fetchTeamMatchesData as ReturnType<typeof vi.fn>).mockResolvedValue([makeRow()]);
    const { result } = renderHook(() => useTeamMatches('team-a'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoadingMatches).toBe(false));
    const match = result.current.upcomingMatches[0];
    expect(match.team1Id).toBe('team-a');
    expect(match.team2Id).toBe('team-b');
    expect(match.team1Score).toBe(2);
  });

  it('returns empty arrays when service returns null', async () => {
    (fetchTeamMatchesData as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { result } = renderHook(() => useTeamMatches('team-a'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoadingMatches).toBe(false));
    expect(result.current.upcomingMatches).toEqual([]);
    expect(result.current.pastMatches).toEqual([]);
  });

  it('propagates service errors to query error state', async () => {
    (fetchTeamMatchesData as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));
    const { result } = renderHook(() => useTeamMatches('team-a'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoadingMatches).toBe(false));
    expect(result.current.upcomingMatches).toEqual([]);
    expect(result.current.pastMatches).toEqual([]);
  });
});
