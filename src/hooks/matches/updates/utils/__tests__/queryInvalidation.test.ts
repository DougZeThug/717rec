import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { invalidateAllDataQueries } from '../queryInvalidation';

describe('invalidateAllDataQueries', () => {
  it('invalidates every match-, team- and ranking-related query key', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateAllDataQueries(queryClient);

    const expectedKeys = [
      ['matches'],
      ['rankings'],
      ['teamStats'],
      ['team-totals'],
      ['season-data'],
      ['team-matches'],
    ];

    // The list is refreshed in the background, so wait for the last key.
    await vi.waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['player-season-stats'] });
    });
    for (const queryKey of expectedKeys) {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey });
    }

    // 'teams' and 'team' are refreshed by one broad rule, not by a plain key.
    const predicateCall = invalidateSpy.mock.calls.find(
      ([arg]) => typeof arg === 'object' && arg !== null && 'predicate' in arg
    );
    const predicate = (
      predicateCall?.[0] as unknown as { predicate: (query: { queryKey: unknown[] }) => boolean }
    ).predicate;
    expect(predicate({ queryKey: ['teams', 'season-1'] })).toBe(true);
    expect(predicate({ queryKey: ['team', 'team-1'] })).toBe(true);
  });

  it('also refreshes the Career, bracket and History pages after a score edit or delete', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateAllDataQueries(queryClient);

    await vi.waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['player-season-stats'] });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['careerRankings'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['bracket-data'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playoff-matches'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['season-data'] });
  });

  it('returns at once and does not hand the caller a promise to wait for', () => {
    const queryClient = new QueryClient();
    vi.spyOn(queryClient, 'invalidateQueries');

    expect(invalidateAllDataQueries(queryClient)).toBeUndefined();
  });
});
