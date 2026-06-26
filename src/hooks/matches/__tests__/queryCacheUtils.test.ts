import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { batchInvalidateQueries, invalidateMatchRelatedQueries } from '../utils/queryCacheUtils';

vi.mock('@/utils/logger', () => ({
  cacheLog: vi.fn(),
}));

describe('match query cache utilities', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('invalidates team-shaped queries with the broad predicate before specific match keys', async () => {
    queryClient.setQueryData(['teams', 'season-1'], [{ id: 'team-1' }]);
    queryClient.setQueryData(['team-details', 'team-1'], { id: 'team-1' });
    queryClient.setQueryData(['messages'], [{ id: 'message-1' }]);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidateMatchRelatedQueries(queryClient);

    const predicateCall = invalidateSpy.mock.calls.find(([arg]) => {
      return typeof arg === 'object' && arg !== null && 'predicate' in arg;
    });

    expect(predicateCall).toBeDefined();
    const predicate = (
      predicateCall?.[0] as unknown as { predicate: (query: { queryKey: unknown[] }) => boolean }
    ).predicate;

    expect(predicate({ queryKey: ['teams', 'season-1'] })).toBe(true);
    expect(predicate({ queryKey: ['team-details', 'team-1'] })).toBe(true);
    expect(predicate({ queryKey: ['messages'] })).toBe(false);
  });

  it('invalidates all match, rankings, career, schedule, head-to-head, and playoff caches', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidateMatchRelatedQueries(queryClient);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['matches'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rankings'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['teamStats'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['team-matches'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['careerRankings'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['season-opponent-history'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['match-head-to-head'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['batch-head-to-head'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['upcoming-matches'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playoff-matches'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['bracket-data'] });
  });

  it('does not read rankings snapshots from React Query cache for persistence', async () => {
    const getQueryDataSpy = vi.spyOn(queryClient, 'getQueryData');
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    await invalidateMatchRelatedQueries(queryClient);

    expect(getQueryDataSpy).not.toHaveBeenCalledWith(['rankings']);
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('batch invalidates only the requested top-level query keys', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await batchInvalidateQueries(queryClient, ['matches', 'playoff-matches']);

    expect(invalidateSpy).toHaveBeenCalledTimes(2);
    expect(invalidateSpy).toHaveBeenNthCalledWith(1, { queryKey: ['matches'] });
    expect(invalidateSpy).toHaveBeenNthCalledWith(2, { queryKey: ['playoff-matches'] });
  });

  it('does not invalidate anything for an empty batch', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await batchInvalidateQueries(queryClient, []);

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
