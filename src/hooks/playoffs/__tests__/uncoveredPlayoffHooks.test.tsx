import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  bmMatch: vi.fn(),
  teams: vi.fn(),
  eligibility: vi.fn(),
  swap: vi.fn(),
  board: vi.fn(),
  rearrange: vi.fn(),
  edit: vi.fn(),
  invalidateRelated: vi.fn(),
  toast: vi.fn(),
  log: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/services/brackets/BracketReadService', () => ({
  fetchBracketsManagerMatchData: mocks.bmMatch,
  fetchPlayoffTeams: mocks.teams,
}));
vi.mock('@/services/brackets/manager', () => ({
  bracketManagerService: {
    checkLoserSwapEligibility: mocks.eligibility,
    adminSwapLoserBracketSlots: mocks.swap,
    getLoserRearrangeBoard: mocks.board,
    applyLoserBracketRearrange: mocks.rearrange,
    editMatchParticipants: mocks.edit,
  },
}));
vi.mock('@/hooks/matches/utils/queryCacheUtils', () => ({
  invalidateMatchRelatedQueries: mocks.invalidateRelated,
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/utils/logger', () => ({
  bracketLog: mocks.log,
  scoreLog: mocks.log,
  errorLog: mocks.error,
}));

import { useBracketsManagerMatch } from '../useBracketsManagerMatch';
import { usePlayoffEditMatchParticipants } from '../usePlayoffEditMatchParticipants';
import { useLoserSwapEligibility, usePlayoffSwapLoserSlots } from '../usePlayoffLoserSwap';
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
    mocks.invalidateRelated.mockImplementation(() => Promise.resolve());
  });
  it('fetches playoff teams', async () => {
    mocks.teams.mockResolvedValue([{ id: 't1' }]);
    const { wrapper } = setup();
    const teams = renderHook(() => usePlayoffTeams(), { wrapper });
    await waitFor(() => expect(teams.result.current.data).toEqual([{ id: 't1' }]));
  });
  it('maps a brackets-manager match and stays idle for null', async () => {
    mocks.bmMatch.mockResolvedValue({
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
    expect(mocks.eligibility).not.toHaveBeenCalled();
    expect(mocks.board).not.toHaveBeenCalled();
    mocks.eligibility.mockResolvedValue({ allowed: true });
    mocks.board.mockResolvedValue({ matches: [] });
    const eligible = renderHook(() => useLoserSwapEligibility(2), { wrapper });
    const board = renderHook(() => useLoserRearrangeBoard('b1', true), { wrapper });
    await waitFor(() => expect(eligible.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(board.result.current.isSuccess).toBe(true));
    expect(mocks.eligibility).toHaveBeenCalledWith(2);
    expect(mocks.board).toHaveBeenCalledWith('b1');
  });
  it('edits participants and refreshes bracket caches', async () => {
    mocks.edit.mockResolvedValue({ message: 'Round 1 Match 2 is now A vs B.' });
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const refetch = vi.spyOn(client, 'refetchQueries');
    const { result } = renderHook(() => usePlayoffEditMatchParticipants('b1'), { wrapper });
    const params = {
      matchId: 2,
      opponent1: { kind: 'team' as const, teamId: 'a' },
      opponent2: { kind: 'team' as const, teamId: 'b' },
      expectedOpponent1Id: 11,
      expectedOpponent2Id: 12,
    };
    await act(async () => {
      await result.current.mutateAsync(params);
    });
    expect(mocks.edit).toHaveBeenCalledWith(params);
    // The open score editor must re-read its match, or it keeps the old teams.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['brackets-manager-match'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['bracket-data', 'b1'] });
    expect(refetch).toHaveBeenCalledWith({ queryKey: ['bracket-data', 'b1'] });
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Teams updated',
        description: 'Round 1 Match 2 is now A vs B.',
      })
    );
  });
  it('reports participant edit errors', async () => {
    mocks.edit.mockRejectedValue(new Error('played'));
    const { wrapper } = setup();
    const { result } = renderHook(() => usePlayoffEditMatchParticipants(null), { wrapper });
    await expect(
      result.current.mutateAsync({
        matchId: 2,
        opponent1: { kind: 'team', teamId: 'a' },
        opponent2: { kind: 'bye' },
        expectedOpponent1Id: 11,
        expectedOpponent2Id: 12,
      })
    ).rejects.toThrow('played');
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Could not update teams',
          description: 'played',
          variant: 'destructive',
        })
      )
    );
  });
  it('swaps loser slots and invalidates affected matches', async () => {
    mocks.swap.mockResolvedValue({ message: 'Done' });
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => usePlayoffSwapLoserSlots(null), { wrapper });
    const params = { sourceMatchId: 1, targetMatchId: 2, sourcePosition: 1, targetPosition: 2 };
    await act(async () => {
      await result.current.mutateAsync(params as never);
    });
    expect(mocks.swap).toHaveBeenCalledWith(params);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['brackets-manager-match', 1] });
    expect(mocks.toast).toHaveBeenCalledWith({ title: 'Teams moved', description: 'Done' });
  });
  it("refreshes the open bracket after a loser swap when a bracket id is given (today's behaviour)", async () => {
    mocks.swap.mockResolvedValue({ message: 'Done' });
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const refetch = vi.spyOn(client, 'refetchQueries');
    const { result } = renderHook(() => usePlayoffSwapLoserSlots('b1'), { wrapper });
    const params = { sourceMatchId: 1, targetMatchId: 2, sourcePosition: 1, targetPosition: 2 };
    await act(async () => {
      await result.current.mutateAsync(params as never);
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['bracket-data', 'b1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['bracket-info', 'b1'] });
    expect(refetch).toHaveBeenCalledWith({ queryKey: ['bracket-data', 'b1'] });
    expect(mocks.toast).toHaveBeenCalledWith({ title: 'Teams moved', description: 'Done' });
  });
  it("leaves the single-bracket caches alone after a loser swap without a bracket id (today's behaviour)", async () => {
    mocks.swap.mockResolvedValue({ message: 'Done' });
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const refetch = vi.spyOn(client, 'refetchQueries');
    const { result } = renderHook(() => usePlayoffSwapLoserSlots(null), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        sourceMatchId: 1,
        targetMatchId: 2,
        sourcePosition: 1,
        targetPosition: 2,
      } as never);
    });
    // invalidateQueries re-reads active queries through refetchQueries, so only
    // the bracket keys are checked here.
    const invalidatedKeys = invalidate.mock.calls.map(([filters]) => filters?.queryKey?.[0]);
    const refetchedKeys = refetch.mock.calls.map(([filters]) => filters?.queryKey?.[0]);
    expect(invalidatedKeys).not.toContain('bracket-data');
    expect(invalidatedKeys).not.toContain('bracket-info');
    expect(refetchedKeys).not.toContain('bracket-data');
  });
  it('applies a rearrangement and shows service errors', async () => {
    mocks.rearrange
      .mockResolvedValueOnce({ message: 'Saved' })
      .mockRejectedValueOnce(new Error('stale'));
    const { wrapper } = setup();
    const { result } = renderHook(() => usePlayoffApplyRearrange('b1'), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ assignments: [], baseline: [] });
    });
    expect(mocks.rearrange).toHaveBeenCalledWith('b1', [], []);
    expect(mocks.toast).toHaveBeenCalledWith({ title: 'Teams rearranged', description: 'Saved' });
    await expect(result.current.mutateAsync({ assignments: [], baseline: [] })).rejects.toThrow(
      'stale'
    );
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Could not rearrange teams', variant: 'destructive' })
      )
    );
  });
});
