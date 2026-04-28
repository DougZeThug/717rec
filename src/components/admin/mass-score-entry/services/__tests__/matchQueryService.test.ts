import { describe, expect, it, vi } from 'vitest';

const mockFetchMatchesForAdmin = vi.fn();

vi.mock('@/services/matches/MatchReadService', () => ({
  fetchMatchesForAdmin: (...args: unknown[]) => mockFetchMatchesForAdmin(...args),
}));

vi.mock('@/utils/logger', () => ({
  matchLog: vi.fn(),
}));

import { buildMatchQuery } from '../matchQueryService';

describe('buildMatchQuery', () => {
  it('passes filters to supabase boundary service', async () => {
    const filters = { date: new Date('2026-03-03T00:00:00.000Z'), bracketId: 'b1' };
    mockFetchMatchesForAdmin.mockResolvedValueOnce([{ id: 'm1' }]);

    const result = await buildMatchQuery(filters);

    expect(mockFetchMatchesForAdmin).toHaveBeenCalledWith(filters);
    expect(result).toEqual([{ id: 'm1' }]);
  });
});
