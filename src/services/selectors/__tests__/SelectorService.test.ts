import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

const { mockFrom, mockSelect, mockOrder } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockOrder: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

import { fetchTeamsForSelector } from '../SelectorService';

const pgError = () => ({
  message: 'query failed',
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const setupTeamsQuery = (result: { data: unknown; error: unknown | null }) => {
  mockOrder.mockResolvedValue(result);
  mockSelect.mockReturnValue({ order: mockOrder });
  mockFrom.mockReturnValue({ select: mockSelect });
};

describe('fetchTeamsForSelector', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns options and uses explicit selected columns', async () => {
    const rows = [{ id: 't1', name: 'Aces' }];
    setupTeamsQuery({ data: rows, error: null });

    const result = await fetchTeamsForSelector();

    expect(mockFrom).toHaveBeenCalledWith('teams');
    expect(mockSelect).toHaveBeenCalledWith('id, name');
    expect(result).toEqual(rows);
  });

  it('throws DatabaseError when Supabase returns an error', async () => {
    setupTeamsQuery({ data: null, error: pgError() });
    await expect(fetchTeamsForSelector()).rejects.toThrow(DatabaseError);
  });

  it('returns empty array when data is null (valid no data case)', async () => {
    setupTeamsQuery({ data: null, error: null });
    await expect(fetchTeamsForSelector()).resolves.toEqual([]);
  });
});
