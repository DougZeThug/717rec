import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MatchWithTeams } from '../../types';

const mockToast = vi.fn();
const mockUpdateTeamRecords = vi.fn();
const mockUpdateMatchArray = vi.fn();
const mockUpsertTeamSeasonStats = vi.fn();
const mockInvalidateMatchRelatedQueries = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/useTeamRecords', () => ({
  useTeamRecords: () => ({ updateTeamRecords: mockUpdateTeamRecords }),
}));

vi.mock('@/services/matches/MatchWriteService', () => ({
  updateMatchArray: (...args: unknown[]) => mockUpdateMatchArray(...args),
  upsertTeamSeasonStats: (...args: unknown[]) => mockUpsertTeamSeasonStats(...args),
}));

vi.mock('@/hooks/matches/utils/queryCacheUtils', () => ({
  invalidateMatchRelatedQueries: (...args: unknown[]) => mockInvalidateMatchRelatedQueries(...args),
}));

vi.mock('@/utils/logger', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/utils/logger');
  return Object.fromEntries(Object.keys(actual).map((name) => [name, vi.fn()]));
});

import { warnLog } from '@/utils/logger';

import { useMatchUpdates } from '../useMatchUpdates';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const team1 = { id: 't1', name: 'Alpha' } as MatchWithTeams['team1'];
const team2 = { id: 't2', name: 'Bravo' } as MatchWithTeams['team2'];

const makeMatch = (overrides: Partial<MatchWithTeams> = {}): MatchWithTeams =>
  ({
    id: 'm1',
    team1Id: 't1',
    team2Id: 't2',
    team1Score: 1,
    team2Score: 0,
    team1_game_wins: 2,
    team2_game_wins: 1,
    iscompleted: true,
    team1,
    team2,
    ...overrides,
  }) as MatchWithTeams;

describe('useMatchUpdates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMatchArray.mockResolvedValue([{ id: 'm1' }]);
    mockUpdateTeamRecords.mockResolvedValue(true);
    mockUpsertTeamSeasonStats.mockResolvedValue(undefined);
    mockInvalidateMatchRelatedQueries.mockResolvedValue(undefined);
  });

  it('writes the full payload for a team-1 win, updates records, and returns true', async () => {
    const { result } = renderHook(() => useMatchUpdates(), { wrapper });

    const success = await result.current.updateMatchInDatabase(makeMatch());

    expect(success).toBe(true);
    expect(mockUpdateMatchArray).toHaveBeenCalledWith('m1', {
      team1_score: 1,
      team2_score: 0,
      iscompleted: true,
      winner_id: 't1',
      loser_id: 't2',
      team1_game_wins: 2,
      team2_game_wins: 1,
    });
    // Winner game wins first (2), loser game wins second (1)
    expect(mockUpdateTeamRecords).toHaveBeenCalledWith('t1', 't2', [team1, team2], 2, 1);
    expect(mockUpsertTeamSeasonStats).toHaveBeenCalledTimes(1);
    expect(mockInvalidateMatchRelatedQueries).toHaveBeenCalledTimes(1);
  });

  it('assigns winner and loser correctly for a team-2 win', async () => {
    const { result } = renderHook(() => useMatchUpdates(), { wrapper });

    const success = await result.current.updateMatchInDatabase(
      makeMatch({ team1Score: 0, team2Score: 1, team1_game_wins: 1, team2_game_wins: 2 })
    );

    expect(success).toBe(true);
    expect(mockUpdateMatchArray).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({
        team1_score: 0,
        team2_score: 1,
        winner_id: 't2',
        loser_id: 't1',
      })
    );
    expect(mockUpdateTeamRecords).toHaveBeenCalledWith('t2', 't1', [team1, team2], 2, 1);
  });

  it('parses string game wins into integers before writing', async () => {
    const { result } = renderHook(() => useMatchUpdates(), { wrapper });

    await result.current.updateMatchInDatabase(
      makeMatch({
        team1_game_wins: '2' as unknown as number,
        team2_game_wins: '1' as unknown as number,
      })
    );

    expect(mockUpdateMatchArray).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({ team1_game_wins: 2, team2_game_wins: 1 })
    );
  });

  it('still writes but warns when a winning match has 0-0 game wins', async () => {
    const { result } = renderHook(() => useMatchUpdates(), { wrapper });

    const success = await result.current.updateMatchInDatabase(
      makeMatch({ team1_game_wins: 0, team2_game_wins: 0 })
    );

    expect(success).toBe(true);
    expect(warnLog).toHaveBeenCalledWith(expect.stringContaining('0-0 game wins'));
    expect(mockUpdateMatchArray).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({ team1_game_wins: 0, team2_game_wins: 0 })
    );
  });

  it('returns false without writing when neither team has a winning binary score', async () => {
    const { result } = renderHook(() => useMatchUpdates(), { wrapper });

    const success = await result.current.updateMatchInDatabase(
      makeMatch({ team1Score: 0, team2Score: 0 })
    );

    expect(success).toBe(false);
    expect(mockUpdateMatchArray).not.toHaveBeenCalled();
    expect(mockUpdateTeamRecords).not.toHaveBeenCalled();
  });

  it('returns false when the database update affects zero rows', async () => {
    mockUpdateMatchArray.mockResolvedValue([]);
    const { result } = renderHook(() => useMatchUpdates(), { wrapper });

    const success = await result.current.updateMatchInDatabase(makeMatch());

    expect(success).toBe(false);
    expect(mockUpdateTeamRecords).not.toHaveBeenCalled();
  });

  it('skips team record updates when the match is not completed but still succeeds', async () => {
    const { result } = renderHook(() => useMatchUpdates(), { wrapper });

    const success = await result.current.updateMatchInDatabase(makeMatch({ iscompleted: false }));

    expect(success).toBe(true);
    expect(mockUpdateTeamRecords).not.toHaveBeenCalled();
    expect(mockUpsertTeamSeasonStats).toHaveBeenCalledTimes(1);
  });

  it('skips team record updates when team objects are missing', async () => {
    const { result } = renderHook(() => useMatchUpdates(), { wrapper });

    const success = await result.current.updateMatchInDatabase(
      makeMatch({ team1: undefined, team2: undefined })
    );

    expect(success).toBe(true);
    expect(mockUpdateTeamRecords).not.toHaveBeenCalled();
  });

  it('returns false when the season stats refresh throws', async () => {
    mockUpsertTeamSeasonStats.mockRejectedValue(new Error('stats failed'));
    const { result } = renderHook(() => useMatchUpdates(), { wrapper });

    const success = await result.current.updateMatchInDatabase(makeMatch());

    expect(success).toBe(false);
  });
});
