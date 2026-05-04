import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

const { mockFrom, mockSelect, mockEq } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

import { MessageReactionsService } from '../MessageReactionsService';

const pgError = () => ({
  message: 'query failed',
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const setupFetch = (result: { data: unknown; error: unknown | null }) => {
  mockEq.mockResolvedValue(result);
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
};

describe('MessageReactionsService.fetchReactions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns reaction rows and uses explicit selected columns', async () => {
    const rows = [
      {
        id: 'r1',
        message_id: 'm1',
        user_id: 'u1',
        emoji: '🔥',
        created_at: '2026-04-01T00:00:00Z',
      },
    ];
    setupFetch({ data: rows, error: null });

    const result = await MessageReactionsService.fetchReactions('m1');

    expect(mockFrom).toHaveBeenCalledWith('message_reactions');
    expect(mockSelect).toHaveBeenCalledWith('id, message_id, user_id, emoji, created_at');
    expect(result).toEqual(rows);
  });

  it('throws DatabaseError when Supabase returns an error', async () => {
    setupFetch({ data: null, error: pgError() });
    await expect(MessageReactionsService.fetchReactions('m1')).rejects.toThrow(DatabaseError);
  });

  it('returns empty array when data is null (valid no data case)', async () => {
    setupFetch({ data: null, error: null });
    await expect(MessageReactionsService.fetchReactions('m1')).resolves.toEqual([]);
  });
});
