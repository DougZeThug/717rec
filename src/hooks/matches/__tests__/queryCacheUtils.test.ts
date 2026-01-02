import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { invalidateMatchRelatedQueries, batchInvalidateQueries } from '../utils/queryCacheUtils';

vi.mock('@/utils/logger', () => ({
  cacheLog: vi.fn()
}));

describe('queryCacheUtils', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
  });

  describe('invalidateMatchRelatedQueries', () => {
    it('invalidates all match-related query keys', async () => {
      await invalidateMatchRelatedQueries(queryClient);

      // Should have called invalidateQueries multiple times
      expect(queryClient.invalidateQueries).toHaveBeenCalled();
    });

    it('invalidates team query variations using predicate', async () => {
      await invalidateMatchRelatedQueries(queryClient);

      // First call should use predicate for team variations
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({
          predicate: expect.any(Function)
        })
      );
    });

    it('invalidates specific query keys in parallel', async () => {
      await invalidateMatchRelatedQueries(queryClient);

      // Check that specific keys are invalidated
      const calls = vi.mocked(queryClient.invalidateQueries).mock.calls;
      const queryKeys = calls
        .filter(call => call[0]?.queryKey)
        .map(call => call[0]?.queryKey?.[0]);

      expect(queryKeys).toContain('matches');
      expect(queryKeys).toContain('rankings');
      expect(queryKeys).toContain('standings');
    });

    it('invalidates career data queries', async () => {
      await invalidateMatchRelatedQueries(queryClient);

      const calls = vi.mocked(queryClient.invalidateQueries).mock.calls;
      const queryKeys = calls
        .filter(call => call[0]?.queryKey)
        .map(call => call[0]?.queryKey?.[0]);

      expect(queryKeys).toContain('careerRankings');
      expect(queryKeys).toContain('all-teams-career-power-scores');
    });

    it('invalidates playoff data queries', async () => {
      await invalidateMatchRelatedQueries(queryClient);

      const calls = vi.mocked(queryClient.invalidateQueries).mock.calls;
      const queryKeys = calls
        .filter(call => call[0]?.queryKey)
        .map(call => call[0]?.queryKey?.[0]);

      expect(queryKeys).toContain('playoff-matches');
      expect(queryKeys).toContain('bracket-data');
    });
  });

  describe('batchInvalidateQueries', () => {
    it('invalidates all provided keys', async () => {
      const keys = ['key1', 'key2', 'key3'];
      
      await batchInvalidateQueries(queryClient, keys);

      expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(keys.length);
    });

    it('invalidates keys in parallel', async () => {
      const keys = ['matches', 'teams', 'rankings'];
      
      await batchInvalidateQueries(queryClient, keys);

      keys.forEach(key => {
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: [key] });
      });
    });

    it('handles empty keys array', async () => {
      await batchInvalidateQueries(queryClient, []);

      expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });
  });
});
