import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { SupabaseSqlStorage } from '../SupabaseSqlStorage';

describe('SupabaseSqlStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path: select(match, id) uses explicit columns and id filter correctly', async () => {
    const eq = vi.fn().mockReturnThis();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 501,
        number: 1,
        round_id: 10,
        group_id: 2,
        stage_id: 7,
        child_count: 0,
        status: 1,
        opponent1_id: 11,
        opponent1_score: null,
        opponent1_result: null,
        opponent2_id: null,
        opponent2_score: null,
        opponent2_result: null,
      },
      error: null,
    });

    const select = vi.fn(() => ({ eq, maybeSingle }));
    mockFrom.mockReturnValue({ select });

    const storage = new SupabaseSqlStorage();
    const result = await storage.select('match', 501);

    expect(mockFrom).toHaveBeenCalledWith('match');
    expect(select).toHaveBeenCalledWith(
      'id, number, stage_id, group_id, round_id, child_count, status, opponent1_id, opponent1_score, opponent1_result, opponent2_id, opponent2_score, opponent2_result'
    );
    expect(eq).toHaveBeenCalledWith('id', 501);
    expect(result).toMatchObject({ id: 501, opponent1: { id: 11 }, opponent2: { id: null } });
  });

  it('missing required rows: select(match, id) returns null when no row exists', async () => {
    const eq = vi.fn().mockReturnThis();
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ eq, maybeSingle }));

    mockFrom.mockReturnValue({ select });

    const storage = new SupabaseSqlStorage();
    const result = await storage.select('match', 999);

    expect(result).toBeNull();
  });

  it('partial write failures: update propagates Supabase error', async () => {
    const pgError = { message: 'write failed', code: '400' };

    const single = vi.fn().mockResolvedValue({
      data: { id: 42, opponent1_id: 1, opponent2_id: null },
      error: null,
    });

    const queryForCurrent = {
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })),
    };

    const eqUpdate = vi.fn().mockResolvedValue({ error: pgError });
    const queryForUpdate = {
      update: vi.fn(() => ({ eq: eqUpdate })),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'match') {
        return {
          ...queryForCurrent,
          ...queryForUpdate,
        };
      }
      return queryForUpdate;
    });

    const storage = new SupabaseSqlStorage();

    await expect(
      storage.update(
        'match',
        { id: 42 },
        { opponent1: { id: null, score: null, result: null }, status: 1 } as any
      )
    ).rejects.toEqual(pgError);

    expect(eqUpdate).toHaveBeenCalledWith('id', 42);
  });
});
