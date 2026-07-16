import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (fn: string, args: unknown) => mockRpc(fn, args),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  badgeLog: vi.fn(),
}));

import { errorLog } from '@/utils/logger';

import { FailedBadgeOperationsService } from '../FailedBadgeOperationsService';

const runRetryAndDelays = async () => {
  const promise = FailedBadgeOperationsService.retryFailedOperations();
  await vi.runAllTimersAsync();
  return promise;
};

describe('FailedBadgeOperationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      'op-1' as `${string}-${string}-${string}-${string}-${string}`
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries queued operations and removes successful ones from pending storage', async () => {
    FailedBadgeOperationsService.queueFailedOperation(
      'match_badges',
      { team1Id: 't1', team2Id: 't2' },
      new Error('first failure'),
      'match-1'
    );

    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });

    const result = await runRetryAndDelays();

    expect(result.total).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.remaining).toEqual([]);
    expect(FailedBadgeOperationsService.getFailedOperationCount()).toBe(0);
    expect(mockRpc).toHaveBeenCalledWith('process_match_badges', {
      p_team1_id: 't1',
      p_team2_id: 't2',
    });
  });

  it('keeps operations in queue after terminal failure (max retries reached)', async () => {
    localStorage.setItem(
      'failed_badge_operations',
      JSON.stringify([
        {
          id: 'op-terminal',
          type: 'kingslayer',
          params: { winnerId: 'w1', loserId: 'l1' },
          error: 'previous failure',
          matchId: 'match-2',
          createdAt: '2026-01-01T00:00:00.000Z',
          retryCount: 3,
        },
      ])
    );

    const result = await runRetryAndDelays();

    expect(result.total).toBe(1);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.remaining).toHaveLength(1);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(FailedBadgeOperationsService.getFailedOperationCount()).toBe(1);
  });

  it('dedupes repeated failed operations for the same match/type/params', () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('op-1' as `${string}-${string}-${string}-${string}-${string}`)
      .mockReturnValueOnce('op-2' as `${string}-${string}-${string}-${string}-${string}`);

    FailedBadgeOperationsService.queueFailedOperation(
      'match_badges',
      { team1Id: 'same-team-1', team2Id: 'same-team-2' },
      'first error',
      'match-3'
    );

    FailedBadgeOperationsService.queueFailedOperation(
      'match_badges',
      { team1Id: 'same-team-1', team2Id: 'same-team-2' },
      'second error',
      'match-3'
    );

    const operations = FailedBadgeOperationsService.getFailedOperations();
    expect(operations).toHaveLength(1);
    expect(operations[0].id).toBe('op-1');
    expect(operations[0].error).toBe('second error');
  });

  it('logs storage write failures without interrupting queueing', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage full');
    });

    expect(() =>
      FailedBadgeOperationsService.queueFailedOperation(
        'match_badges',
        { team1Id: 't1', team2Id: 't2' },
        'write failed',
        'match-storage'
      )
    ).not.toThrow();

    expect(errorLog).toHaveBeenCalledWith(
      'Failed to save badge operations to storage:',
      expect.any(Error)
    );

    setItemSpy.mockRestore();
  });

  it('retries kingslayer operations with the original winner and loser ids', async () => {
    localStorage.setItem(
      'failed_badge_operations',
      JSON.stringify([
        {
          id: 'op-kingslayer',
          type: 'kingslayer',
          params: { winnerId: 'winner-1', loserId: 'loser-1' },
          error: 'previous failure',
          matchId: 'match-kingslayer',
          createdAt: '2026-01-01T00:00:00.000Z',
          retryCount: 0,
        },
      ])
    );
    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });

    const result = await runRetryAndDelays();

    expect(result.succeeded).toBe(1);
    expect(mockRpc).toHaveBeenCalledWith('award_kingslayer_badge', {
      p_winner_id: 'winner-1',
      p_loser_id: 'loser-1',
    });
  });

  it('keeps failed bully retries in storage with updated retry metadata', async () => {
    localStorage.setItem(
      'failed_badge_operations',
      JSON.stringify([
        {
          id: 'op-bully',
          type: 'bully_loser',
          params: { teamId: 'team-bully' },
          error: 'previous failure',
          matchId: 'match-bully',
          createdAt: '2026-01-01T00:00:00.000Z',
          retryCount: 0,
        },
      ])
    );
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

    const result = await runRetryAndDelays();

    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.remaining[0]).toMatchObject({
      id: 'op-bully',
      type: 'bully_loser',
      retryCount: 1,
    });
    expect(mockRpc).toHaveBeenCalledWith('award_bully_badge', {
      p_team_id: 'team-bully',
    });
  });
});
