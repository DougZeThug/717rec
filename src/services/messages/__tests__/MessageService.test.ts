import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError, DatabaseError } from '@/types/errors';

const {
  mockFrom,
  mockSelect,
  mockOrder,
  mockLimit,
  mockNeq,
  mockUpdate,
  mockEqId,
  mockEqUser,
  mockSelectUpdated,
  mockMaybeSingle,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockOrder: vi.fn(),
  mockLimit: vi.fn(),
  mockNeq: vi.fn(),
  mockUpdate: vi.fn(),
  mockEqId: vi.fn(),
  mockEqUser: vi.fn(),
  mockSelectUpdated: vi.fn(),
  mockMaybeSingle: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

import { MessageService } from '../MessageService';

const pgError = () => ({
  message: 'query failed',
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const setupFetchMessages = (result: { data: unknown; error: unknown | null }) => {
  mockNeq.mockResolvedValue(result);
  mockLimit.mockReturnValue({ neq: mockNeq });
  mockOrder.mockReturnValue({ limit: mockLimit });
  mockSelect.mockReturnValue({ order: mockOrder });
  mockFrom.mockReturnValue({ select: mockSelect });
};

describe('MessageService.fetchMessages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns message rows and uses explicit selected columns', async () => {
    const rows = [
      {
        id: 'm1',
        content: 'Hello league',
        created_at: '2026-04-01T00:00:00Z',
        username: 'captain',
        team_name: 'Aces',
        user_id: 'u1',
        team_id: 't1',
        category: 'general',
        updated_at: null,
        is_edited: false,
      },
    ];
    setupFetchMessages({ data: rows, error: null });

    const result = await MessageService.fetchMessages({ limit: 5 });

    expect(mockFrom).toHaveBeenCalledWith('messages');
    expect(mockSelect).toHaveBeenCalledWith(
      'id, content, created_at, username, team_name, user_id, team_id, category, updated_at, is_edited'
    );
    expect(result).toEqual(rows);
  });

  it('throws DatabaseError when Supabase returns an error', async () => {
    setupFetchMessages({ data: null, error: pgError() });
    await expect(MessageService.fetchMessages()).rejects.toThrow(DatabaseError);
  });

  it('returns empty array when query returns no rows', async () => {
    setupFetchMessages({ data: [], error: null });
    const result = await MessageService.fetchMessages();
    expect(result).toEqual([]);
  });
});

// update -> eq(id) -> eq(user_id) -> select('id') -> maybeSingle()
const setupUpdateMessage = (result: { data: unknown; error: unknown | null }) => {
  mockMaybeSingle.mockResolvedValue(result);
  mockSelectUpdated.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockEqUser.mockReturnValue({ select: mockSelectUpdated });
  mockEqId.mockReturnValue({ eq: mockEqUser });
  mockUpdate.mockReturnValue({ eq: mockEqId });
  mockFrom.mockReturnValue({ update: mockUpdate });
};

describe('MessageService.updateMessage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the content of your own message and returns nothing', async () => {
    setupUpdateMessage({ data: { id: 'm1' }, error: null });

    await expect(MessageService.updateMessage('m1', 'u1', 'New text')).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith('messages');
    expect(mockUpdate).toHaveBeenCalledWith({ content: 'New text' });
    expect(mockEqId).toHaveBeenCalledWith('id', 'm1');
    expect(mockEqUser).toHaveBeenCalledWith('user_id', 'u1');
    expect(mockSelectUpdated).toHaveBeenCalledWith('id');
  });

  it('throws DatabaseError when Supabase returns an error', async () => {
    setupUpdateMessage({ data: null, error: pgError() });
    await expect(MessageService.updateMessage('m1', 'u1', 'New text')).rejects.toThrow(
      DatabaseError
    );
  });

  it('throws BusinessLogicError when no row was updated (message deleted)', async () => {
    setupUpdateMessage({ data: null, error: null });
    const result = MessageService.updateMessage('m1', 'u1', 'New text');
    await expect(result).rejects.toThrow(BusinessLogicError);
    await expect(result).rejects.toThrow(/may have been deleted/);
  });
});
