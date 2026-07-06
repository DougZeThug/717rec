import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { invalidateAllDataQueries } from '../queryInvalidation';

describe('invalidateAllDataQueries', () => {
  it('invalidates every match-, team- and ranking-related query key', () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateAllDataQueries(queryClient);

    const expectedKeys = [
      ['matches'],
      ['teams'],
      ['rankings'],
      ['teamStats'],
      ['team-totals'],
      ['season-data'],
      ['team'],
      ['team-matches'],
    ];

    expect(invalidateSpy).toHaveBeenCalledTimes(expectedKeys.length);
    for (const queryKey of expectedKeys) {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey });
    }
  });
});
