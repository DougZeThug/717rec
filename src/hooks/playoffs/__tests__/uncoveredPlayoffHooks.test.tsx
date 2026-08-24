import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  bracket: vi.fn(),
  bmMatch: vi.fn(),
  teams: vi.fn(),
  participants: vi.fn(),
  legacyTeams: vi.fn(),
  scores: vi.fn(),
  games: vi.fn(),
  eligibility: vi.fn(),
  swap: vi.fn(),
  board: vi.fn(),
  rearrange: vi.fn(),
  edit: vi.fn(),
  update: vi.fn(),
  invalidateRelated: vi.fn(),
  toast: vi.fn(),
  log: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/services/brackets/BracketReadService', () => ({
  fetchPlayoffBracketData: m.bracket,
  fetchBracketsManagerMatchData: m.bmMatch,
  fetchPlayoffTeams: m.teams,
  fetchBmMatchData: m.bmMatch,
  fetchParticipantsByIds: m.participants,
  fetchPlayoffMatchTeams: m.legacyTeams,
}));
vi.mock('@/services/brackets/BracketWriteService', () => ({
  updatePlayoffMatchScores: m.scores,
  replacePlayoffGames: m.games,
}));
vi.mock('@/services/brackets/manager', () => ({
  bracketManagerService: {
    checkLoserSwapEligibility: m.eligibility,
    adminSwapLoserBracketSlots: m.swap,
    getLoserRearrangeBoard: m.board,
    applyLoserBracketRearrange: m.rearrange,
    editMatchParticipants: m.edit,
    updateMatch: m.update,
  },
}));
vi.mock('@/hooks/matches/utils/queryCacheUtils', () => ({
  invalidateMatchRelatedQueries: m.invalidateRelated,
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: m.toast }) }));
vi.mock('@/utils/logger', () => ({ bracketLog: m.log, scoreLog: m.log, errorLog: m.error }));

import { useBracketsManagerMatch } from '../useBracketsManagerMatch';
import { usePlayoffBracketData } from '../usePlayoffBracketData';
import { usePlayoffEditMatchParticipants } from '../usePlayoffEditMatchParticipants';
import { useLoserSwapEligibility, usePlayoffSwapLoserSlots } from '../usePlayoffLoserSwap';
import { usePlayoffMatchUpdate } from '../usePlayoffMatchUpdate';
import { useLoserRearrangeBoard, usePlayoffApplyRearrange } from '../usePlayoffRearrange';
import { usePlayoffTeams } from '../usePlayoffTeams';

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
};
describe('uncovered playoff hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.invalidateRelated.mockResolvedValue(undefined);
  });
  it('returns null bracket data without a service call', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => usePlayoffBracketData(null), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(m.bracket).not.toHaveBeenCalled();
  });
  it('fetches bracket data and playoff teams', async () => {
    m.bracket.mockResolvedValue({ id: 'b1' });
    m.teams.mockResolvedValue([{ id: 't1' }]);
    const { wrapper } = setup();
    const bracket = renderHook(() => usePlayoffBracketData('b1'), { wrapper });
    const teams = renderHook(() => usePlayoffTeams(), { wrapper });
    await waitFor(() => expect(bracket.result.current.data).toEqual({ id: 'b1' }));
    await waitFor(() => expect(teams.result.current.data).toEqual([{ id: 't1' }]));
    expect(m.bracket).toHaveBeenCalledWith('b1');
  });
  it('maps a brackets-manager match and stays idle for null', async () => {
    m.bmMatch.mockResolvedValue({
      matchData: {
        id: 4,
        stage_id: 1,
        group_id: 2,
        round_id: 3,
        number: 1,
        status: 2,
        opponent1_score: 2,
        opponent1_result: 'win',
        opponent2_score: 0,
        opponent2_result: 'loss',
      },
      gamesData: [{ id: 1 }],
      opponent1Data: { id: 10, name: null, team_id: 't1' },
      opponent2Data: null,
    });
    const { wrapper } = setup();
    const idle = renderHook(() => useBracketsManagerMatch(null), { wrapper });
    expect(idle.result.current.fetchStatus).toBe('idle');
    const hook = renderHook(() => useBracketsManagerMatch(4), { wrapper });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(hook.result.current.data).toMatchObject({
      id: 4,
      opponent1: { name: '', team_id: 't1', score: 2 },
      opponent2: null,
      games: [{ id: 1 }],
    });
  });
  it('gates loser queries and forwards enabled query arguments', async () => {
    const { wrapper } = setup();
    renderHook(() => useLoserSwapEligibility(null), { wrapper });
    renderHook(() => useLoserRearrangeBoard('b1', false), { wrapper });
    expect(m.eligibility).not.toHaveBeenCalled();
    expect(m.board).not.toHaveBeenCalled();
    m.eligibility.mockResolvedValue({ allowed: true });
    m.board.mockResolvedValue({ matches: [] });
    const eligible = renderHook(() => useLoserSwapEligibility(2), { wrapper });
    const board = renderHook(() => useLoserRearrangeBoard('b1', true), { wrapper });
    await waitFor(() => expect(eligible.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(board.result.current.isSuccess).toBe(true));
    expect(m.eligibility).toHaveBeenCalledWith(2);
    expect(m.board).toHaveBeenCalledWith('b1');
  });
  it('edits participants and refreshes bracket caches', async () => {
    m.edit.mockResolvedValue({});
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const refetch = vi.spyOn(client, 'refetchQueries');
    const { result } = renderHook(() => usePlayoffEditMatchParticipants('b1'), { wrapper });
    await act(async () =>
      result.current.mutateAsync({ matchId: 2, opponent1TeamId: 'a', opponent2TeamId: null })
    );
    expect(m.edit).toHaveBeenCalledWith(2, 'a', null);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['bracket-data', 'b1'] });
    expect(refetch).toHaveBeenCalledWith({ queryKey: ['bracket-data', 'b1'] });
    expect(m.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Teams updated' }));
  });
  it('reports participant edit errors', async () => {
    m.edit.mockRejectedValue(new Error('played'));
    const { wrapper } = setup();
    const { result } = renderHook(() => usePlayoffEditMatchParticipants(null), { wrapper });
    await expect(
      result.current.mutateAsync({ matchId: 2, opponent1TeamId: null, opponent2TeamId: null })
    ).rejects.toThrow('played');
    await waitFor(() =>
      expect(m.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Could not update teams',
          description: 'played',
          variant: 'destructive',
        })
      )
    );
  });
  it('swaps loser slots and invalidates affected matches', async () => {
    m.swap.mockResolvedValue({ message: 'Done' });
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => usePlayoffSwapLoserSlots(null), { wrapper });
    const params = { sourceMatchId: 1, targetMatchId: 2, sourcePosition: 1, targetPosition: 2 };
    await act(async () => result.current.mutateAsync(params as never));
    expect(m.swap).toHaveBeenCalledWith(params);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['brackets-manager-match', 1] });
    expect(m.toast).toHaveBeenCalledWith({ title: 'Teams moved', description: 'Done' });
  });
  it('applies a rearrangement and shows service errors', async () => {
    m.rearrange
      .mockResolvedValueOnce({ message: 'Saved' })
      .mockRejectedValueOnce(new Error('stale'));
    const { wrapper } = setup();
    const { result } = renderHook(() => usePlayoffApplyRearrange('b1'), { wrapper });
    await act(async () => result.current.mutateAsync({ assignments: [], baseline: [] }));
    expect(m.rearrange).toHaveBeenCalledWith('b1', [], []);
    expect(m.toast).toHaveBeenCalledWith({ title: 'Teams rearranged', description: 'Saved' });
    await expect(result.current.mutateAsync({ assignments: [], baseline: [] })).rejects.toThrow(
      'stale'
    );
    await waitFor(() =>
      expect(m.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Could not rearrange teams', variant: 'destructive' })
      )
    );
  });
  it('updates a legacy match and replaces its games', async () => {
    m.legacyTeams.mockResolvedValue({ team1_id: 't1', team2_id: 't2' });
    m.scores.mockResolvedValue({});
    m.games.mockResolvedValue({});
    const { wrapper } = setup();
    const { result } = renderHook(
      () => usePlayoffMatchUpdate({ id: 'b1', uses_brackets_manager: false } as never),
      { wrapper }
    );
    expect(result.current.useBracketsManager).toBe(false);
    await act(async () =>
      result.current.updateMatch('m1', 21, 18, [{ team1Score: 21, team2Score: 18 }], 2, 0)
    );
    expect(m.scores).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({
        team1_score: 2,
        team2_score: 0,
        winner_id: 't1',
        loser_id: 't2',
        status: 'completed',
      })
    );
    expect(m.games).toHaveBeenCalledWith('m1', [
      { game_number: 1, team1_score: 21, team2_score: 18, winner_id: 't1' },
    ]);
  });
  it('updates a brackets-manager match and refreshes its bracket', async () => {
    m.bmMatch.mockResolvedValue({ opponent1_id: 1, opponent2_id: 2 });
    m.participants.mockResolvedValue([]);
    m.update.mockResolvedValue({});
    const { client, wrapper } = setup();
    const refetch = vi.spyOn(client, 'refetchQueries');
    const { result } = renderHook(
      () => usePlayoffMatchUpdate({ id: 'b1', uses_brackets_manager: true } as never),
      { wrapper }
    );
    await act(async () => result.current.updateMatch('9', 0, 0, [], 1, 2));
    expect(m.update).toHaveBeenCalledWith({
      matchId: 9,
      scores: { opponent1: { score: 1, result: 'loss' }, opponent2: { score: 2, result: 'win' } },
    });
    expect(refetch).toHaveBeenCalledWith({ queryKey: ['bracket-data', 'b1'] });
  });
});
