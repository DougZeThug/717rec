import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match, Team } from '@/types';

const mockUpdateMatch = vi.fn();
const mockUpsertTeamSeasonStats = vi.fn();
const mockReverseTeamStatsService = vi.fn();
const mockReverseTeamStats = vi.fn();
const mockUpdateTeamRecords = vi.fn();

vi.mock('@/services/matches/MatchWriteService', () => ({
  updateMatch: (...args: unknown[]) => mockUpdateMatch(...args),
  upsertTeamSeasonStats: (...args: unknown[]) => mockUpsertTeamSeasonStats(...args),
  reverseTeamStats: (...args: unknown[]) => mockReverseTeamStatsService(...args),
}));

vi.mock('../utils/statReversalUtils', () => ({
  reverseTeamStats: (...args: unknown[]) => mockReverseTeamStats(...args),
}));

vi.mock('../utils/queryInvalidation', () => ({
  invalidateAllDataQueries: vi.fn(),
}));

vi.mock('@/hooks/useTeamRecords', () => ({
  useTeamRecords: () => ({ updateTeamRecords: mockUpdateTeamRecords }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { useMatchUpdate } from '../useMatchUpdate';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const completedMatch: Match = {
  id: 'm1',
  team1Id: 't1',
  team2Id: 't2',
  date: '2026-01-01',
  location: 'Court',
  iscompleted: true,
  team1Score: 2,
  team2Score: 1,
  winnerId: 't1',
  loserId: 't2',
  team1_game_wins: 2,
  team2_game_wins: 1,
} as unknown as Match;

describe('useMatchUpdate — Case 1 regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMatch.mockResolvedValue({
      id: 'm1',
      team1_id: 't1',
      team2_id: 't2',
      date: '2026-01-01',
      location: 'Court',
      iscompleted: false,
      team1_score: null,
      team2_score: null,
      winner_id: null,
      loser_id: null,
      team1_game_wins: 2,
      team2_game_wins: 1,
    });
    mockReverseTeamStats.mockResolvedValue(undefined);
    mockUpsertTeamSeasonStats.mockResolvedValue(undefined);
  });

  it('calls upsertTeamSeasonStats after reverseTeamStats when completed → incomplete', async () => {
    const setMatches = vi.fn();
    const setEditingMatch = vi.fn();

    const { result } = renderHook(
      () =>
        useMatchUpdate({
          matches: [completedMatch],
          setMatches,
          editingMatch: completedMatch,
          setEditingMatch,
        }),
      { wrapper }
    );

    const incomplete: Omit<Match, 'id'> = {
      ...completedMatch,
      iscompleted: false,
      winnerId: undefined,
      loserId: undefined,
      team1Score: undefined,
      team2Score: undefined,
    } as unknown as Omit<Match, 'id'>;

    await act(async () => {
      await result.current.handleUpdateMatch(incomplete, [] as Team[]);
    });

    expect(mockReverseTeamStats).toHaveBeenCalledTimes(1);
    expect(mockReverseTeamStats).toHaveBeenCalledWith('t1', 't2', 2, 1);
    expect(mockUpsertTeamSeasonStats).toHaveBeenCalledTimes(1);

    // Order: reverse before upsert
    const reverseOrder = mockReverseTeamStats.mock.invocationCallOrder[0];
    const upsertOrder = mockUpsertTeamSeasonStats.mock.invocationCallOrder[0];
    expect(upsertOrder).toBeGreaterThan(reverseOrder);

    // updateTeamRecords (Case 2 path) should NOT run when match is now incomplete
    expect(mockUpdateTeamRecords).not.toHaveBeenCalled();
  });
});