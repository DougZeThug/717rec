import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match, Team } from '@/types';

const mockUpdateMatch = vi.fn();
const mockUpsertTeamSeasonStats = vi.fn();
const mockReverseTeamStatsService = vi.fn();
const mockReverseTeamStats = vi.fn();
const mockResubmitMatchResult = vi.fn();

vi.mock('@/services/matches/MatchWriteService', () => ({
  updateMatch: (...args: unknown[]) => mockUpdateMatch(...args),
  upsertTeamSeasonStats: (...args: unknown[]) => mockUpsertTeamSeasonStats(...args),
  reverseTeamStats: (...args: unknown[]) => mockReverseTeamStatsService(...args),
  resubmitMatchResult: (...args: unknown[]) => mockResubmitMatchResult(...args),
}));

vi.mock('../utils/statReversalUtils', () => ({
  reverseTeamStats: (...args: unknown[]) => mockReverseTeamStats(...args),
}));

vi.mock('../utils/queryInvalidation', () => ({
  invalidateAllDataQueries: vi.fn(),
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

    // The atomic result RPC (Case 2 path) should NOT run when match is now incomplete
    expect(mockResubmitMatchResult).not.toHaveBeenCalled();
  });

  it('skips stat reversal when the previously completed match had no recorded winner/loser', async () => {
    const noWinnerMatch = {
      ...completedMatch,
      winnerId: undefined,
      loserId: undefined,
    } as unknown as Match;

    const { result } = renderHook(
      () =>
        useMatchUpdate({
          matches: [noWinnerMatch],
          setMatches: vi.fn(),
          editingMatch: noWinnerMatch,
          setEditingMatch: vi.fn(),
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.handleUpdateMatch(
        { ...noWinnerMatch, iscompleted: false } as unknown as Omit<Match, 'id'>,
        [] as Team[]
      );
    });

    expect(mockReverseTeamStats).not.toHaveBeenCalled();
    expect(mockUpsertTeamSeasonStats).not.toHaveBeenCalled();
  });
});

describe('useMatchUpdate — Case 2 (completion / winner changes)', () => {
  const incompleteMatch: Match = {
    id: 'm1',
    team1Id: 't1',
    team2Id: 't2',
    date: '2026-01-01',
    location: 'Court',
    iscompleted: false,
  } as unknown as Match;

  const completedDbRow = {
    id: 'm1',
    team1_id: 't1',
    team2_id: 't2',
    date: '2026-01-01',
    location: 'Court',
    iscompleted: true,
    team1_score: 1,
    team2_score: 0,
    winner_id: 't1',
    loser_id: 't2',
    team1_game_wins: 2,
    team2_game_wins: 1,
  };

  const completedMatchData = {
    ...incompleteMatch,
    iscompleted: true,
    team1Score: 1,
    team2Score: 0,
    winnerId: 't1',
    loserId: 't2',
    team1_game_wins: 2,
    team2_game_wins: 1,
  } as unknown as Omit<Match, 'id'>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMatch.mockResolvedValue(completedDbRow);
    mockResubmitMatchResult.mockResolvedValue({
      applied: true,
      reversed_previous: false,
      previous_winner_id: null,
    });
  });

  it('calls resubmit_match_result RPC when an incomplete match is completed', async () => {
    const setMatches = vi.fn();
    const { result } = renderHook(
      () =>
        useMatchUpdate({
          matches: [incompleteMatch],
          setMatches,
          editingMatch: incompleteMatch,
          setEditingMatch: vi.fn(),
        }),
      { wrapper }
    );

    let outcome = false;
    await act(async () => {
      outcome = await result.current.handleUpdateMatch(completedMatchData, [] as Team[]);
    });

    expect(outcome).toBe(true);
    // matchId, winnerId, loserId, winner game wins, loser game wins
    expect(mockResubmitMatchResult).toHaveBeenCalledWith('m1', 't1', 't2', 2, 1);
    expect(mockReverseTeamStats).not.toHaveBeenCalled();
    expect(mockUpsertTeamSeasonStats).not.toHaveBeenCalled();
    // State updated with the intended winner/loser
    expect(setMatches).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'm1', winnerId: 't1', loserId: 't2', iscompleted: true }),
    ]);
  });

  it('delegates reversal + reapplication to resubmit RPC when the winner changes on a completed match', async () => {
    const previouslyCompleted = {
      ...incompleteMatch,
      iscompleted: true,
      winnerId: 't2',
      loserId: 't1',
      team1_game_wins: 1,
      team2_game_wins: 2,
    } as unknown as Match;

    const { result } = renderHook(
      () =>
        useMatchUpdate({
          matches: [previouslyCompleted],
          setMatches: vi.fn(),
          editingMatch: previouslyCompleted,
          setEditingMatch: vi.fn(),
        }),
      { wrapper }
    );

    let outcome = false;
    await act(async () => {
      outcome = await result.current.handleUpdateMatch(completedMatchData, [] as Team[]);
    });

    expect(outcome).toBe(true);
    // Reversal + reapplication happen atomically inside the RPC
    expect(mockReverseTeamStats).not.toHaveBeenCalled();
    expect(mockResubmitMatchResult).toHaveBeenCalledWith('m1', 't1', 't2', 2, 1);
  });

  it('does not touch stats when a completed match is edited without winner/score changes', async () => {
    const previouslyCompleted = {
      ...incompleteMatch,
      iscompleted: true,
      winnerId: 't1',
      loserId: 't2',
      team1_game_wins: 2,
      team2_game_wins: 1,
    } as unknown as Match;

    const { result } = renderHook(
      () =>
        useMatchUpdate({
          matches: [previouslyCompleted],
          setMatches: vi.fn(),
          editingMatch: previouslyCompleted,
          setEditingMatch: vi.fn(),
        }),
      { wrapper }
    );

    let outcome = false;
    await act(async () => {
      // Same winner/loser/game wins — only e.g. location would differ
      outcome = await result.current.handleUpdateMatch(
        { ...completedMatchData, location: 'New Court' } as unknown as Omit<Match, 'id'>,
        [] as Team[]
      );
    });

    expect(outcome).toBe(true);
    expect(mockReverseTeamStats).not.toHaveBeenCalled();
    // No winner/loser/game-wins changes → hook short-circuits before RPC.
    expect(mockResubmitMatchResult).not.toHaveBeenCalled();
  });

  it('returns false when the atomic resubmit RPC throws', async () => {
    mockResubmitMatchResult.mockRejectedValueOnce(new Error('rpc down'));

    const { result } = renderHook(
      () =>
        useMatchUpdate({
          matches: [incompleteMatch],
          setMatches: vi.fn(),
          editingMatch: incompleteMatch,
          setEditingMatch: vi.fn(),
        }),
      { wrapper }
    );

    let outcome = true;
    await act(async () => {
      outcome = await result.current.handleUpdateMatch(completedMatchData, [] as Team[]);
    });

    expect(outcome).toBe(false);
  });

  it('returns false when the match update itself throws and leaves state untouched', async () => {
    mockUpdateMatch.mockRejectedValue(new Error('update failed'));
    const setMatches = vi.fn();

    const { result } = renderHook(
      () =>
        useMatchUpdate({
          matches: [incompleteMatch],
          setMatches,
          editingMatch: incompleteMatch,
          setEditingMatch: vi.fn(),
        }),
      { wrapper }
    );

    let outcome = true;
    await act(async () => {
      outcome = await result.current.handleUpdateMatch(completedMatchData, [] as Team[]);
    });

    expect(outcome).toBe(false);
    expect(setMatches).not.toHaveBeenCalled();
    expect(mockResubmitMatchResult).not.toHaveBeenCalled();
    expect(result.current.isUpdating).toBe(false);
  });

  it('returns false without calling the service when no match is being edited', async () => {
    const { result } = renderHook(
      () =>
        useMatchUpdate({
          matches: [incompleteMatch],
          setMatches: vi.fn(),
          editingMatch: undefined,
          setEditingMatch: vi.fn(),
        }),
      { wrapper }
    );

    let outcome = true;
    await act(async () => {
      outcome = await result.current.handleUpdateMatch(completedMatchData, [] as Team[]);
    });

    expect(outcome).toBe(false);
    expect(mockUpdateMatch).not.toHaveBeenCalled();
  });
});
