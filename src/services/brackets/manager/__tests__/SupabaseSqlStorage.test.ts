import type { DataTypes } from 'brackets-manager';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockHandleDatabaseError, mockBracketLog, mockErrorLog } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockHandleDatabaseError: vi.fn((error: unknown, _context?: string) => {
    throw error;
  }),
  mockBracketLog: vi.fn(),
  mockErrorLog: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/errorHandler', () => ({
  handleDatabaseError: (error: unknown, context: string) => mockHandleDatabaseError(error, context),
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: (...args: unknown[]) => mockBracketLog(...args),
  errorLog: (...args: unknown[]) => mockErrorLog(...args),
}));

import { SupabaseSqlStorage } from '../SupabaseSqlStorage';

describe('SupabaseSqlStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('select(match, id) inflates structural opponent positions from their columns', async () => {
    // Positions are the library's feeder markers, persisted per slot — they
    // come from the match row itself, never from participant seed data.
    const eqMatch = vi.fn().mockReturnThis();
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
        opponent1_position: 1,
        opponent2_id: 12,
        opponent2_score: null,
        opponent2_result: null,
        opponent2_position: null,
      },
      error: null,
    });
    const matchSelect = vi.fn(() => ({ eq: eqMatch, maybeSingle }));
    mockFrom.mockReturnValue({ select: matchSelect });

    const storage = new SupabaseSqlStorage();
    const match = await storage.select('match', 501);

    expect(match).toMatchObject({ opponent1: { id: 11, position: 1 }, opponent2: { id: 12 } });
    expect((match as { opponent2: object }).opponent2).not.toHaveProperty('position');
  });

  it('select(match, id) returns null when no row exists', async () => {
    const eq = vi.fn().mockReturnThis();
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ eq, maybeSingle }));

    mockFrom.mockReturnValue({ select });

    const storage = new SupabaseSqlStorage();
    const result = await storage.select('match', 999);

    expect(result).toBeNull();
  });

  it('select(match, id) inflates NULL columns as bare TBD slots and the sentinel as a BYE', async () => {
    const eq = vi.fn().mockReturnThis();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 900,
        number: 2,
        round_id: 1,
        group_id: 1,
        stage_id: 1,
        child_count: 0,
        status: 1,
        opponent1_id: null,
        opponent1_score: null,
        opponent1_result: null,
        opponent2_id: null,
        opponent2_score: null,
        opponent2_result: 'bye',
      },
      error: null,
    });

    mockFrom.mockReturnValue({ select: vi.fn(() => ({ eq, maybeSingle })) });

    const storage = new SupabaseSqlStorage();
    const result = (await storage.select('match', 900)) as {
      opponent1: object | null;
      opponent2: object | null;
    };

    // TBD: id-only object — no score/result keys (the library reads a
    // defined score as "match started").
    expect(result.opponent1).toEqual({ id: null });
    // BYE sentinel: a strictly-null slot.
    expect(result.opponent2).toBeNull();
  });

  it('non-match select uses configured explicit columns', async () => {
    const eq = vi
      .fn()
      .mockResolvedValue({ data: [{ id: 6, name: 'Stage 1', number: 1 }], error: null });
    const select = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const storage = new SupabaseSqlStorage();
    await storage.select('stage', { tournament_id: 't1' } as Partial<DataTypes['stage']>);

    expect(select).toHaveBeenCalledWith('id, name, number, settings, tournament_id, type');
  });

  it('insert: single returns id, array returns true, and match insert flattens opponents', async () => {
    const insert = vi.fn((payload: Record<string, unknown>[]) => {
      const ids = payload.map((_, index) => ({ id: index + 100 }));
      return {
        select: vi.fn().mockResolvedValue({ data: ids, error: null }),
      };
    });

    mockFrom.mockReturnValue({ insert });

    const storage = new SupabaseSqlStorage();

    const singleId = await storage.insert('match', {
      number: 1,
      round_id: 1,
      group_id: 1,
      stage_id: 1,
      opponent1: { id: 10, score: 2, result: 'win' },
      opponent2: { id: 20, score: 1, result: 'loss' },
    } as never);

    const manyResult = await storage.insert('match', [
      {
        number: 2,
        round_id: 1,
        group_id: 1,
        stage_id: 1,
        opponent1: { id: 11 },
        opponent2: { id: 21 },
      },
      {
        number: 3,
        round_id: 1,
        group_id: 1,
        stage_id: 1,
        opponent1: { id: 12 },
        opponent2: { id: 22 },
      },
    ] as never);

    expect(singleId).toBe(100);
    expect(manyResult).toBe(true);

    const singleInsertPayload = insert.mock.calls[0][0][0];
    expect(singleInsertPayload).toMatchObject({
      opponent1_id: 10,
      opponent1_score: 2,
      opponent1_result: 'win',
      opponent2_id: 20,
      opponent2_score: 1,
      opponent2_result: 'loss',
    });
    expect(singleInsertPayload).not.toHaveProperty('opponent1');
    expect(singleInsertPayload).not.toHaveProperty('opponent2');
  });

  it('update supports id filter and object filter branches without any prefetch', async () => {
    const eqUpdateId = vi.fn().mockResolvedValue({ error: null });
    const eqUpdateObject = vi
      .fn()
      .mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ error: null }) });

    const update = vi
      .fn()
      .mockReturnValueOnce({ eq: eqUpdateId })
      .mockReturnValueOnce({ eq: eqUpdateObject });
    const select = vi.fn();

    mockFrom.mockReturnValue({ select, update });

    const storage = new SupabaseSqlStorage();

    const idResult = await storage.update('match', 42, {
      opponent1: { id: 1 },
      opponent2: { id: 2 },
    } as unknown as DataTypes['match']);

    const objectResult = await storage.update(
      'match',
      { id: 42, stage_id: 7 } as Partial<DataTypes['match']>,
      { status: 4 } as Partial<DataTypes['match']>
    );

    expect(idResult).toBe(true);
    expect(objectResult).toBe(true);
    expect(eqUpdateId).toHaveBeenCalledWith('id', 42);
    expect(eqUpdateObject).toHaveBeenCalledWith('id', 42);
    // No defensive-merge prefetch: writes are applied verbatim.
    expect(select).not.toHaveBeenCalled();
  });

  it('update applies slot clears verbatim — the library is authoritative', async () => {
    // The retired "defensive merge" used to strip null id writes; that
    // rejected the library's legitimate slot moves (reset/reseed) and
    // created duplicate participants downstream.
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn<(payload: Record<string, unknown>) => { eq: typeof updateEq }>(() => ({
      eq: updateEq,
    }));

    mockFrom.mockReturnValue({ update });

    const storage = new SupabaseSqlStorage();

    await storage.update('match', { id: 77 }, {
      opponent1: { id: null },
      opponent2: { id: null },
    } as unknown as Partial<DataTypes['match']>);

    const payload = update.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      opponent1_id: null,
      opponent1_score: null,
      opponent1_result: null,
      opponent2_id: null,
      opponent2_score: null,
      opponent2_result: null,
    });
  });

  it('non-match update issues no select', async () => {
    const stageUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const stageUpdate = vi.fn(() => ({ eq: stageUpdateEq }));
    const stageSelect = vi.fn();

    mockFrom.mockImplementation((table: string) => ({
      select: table === 'stage' ? stageSelect : vi.fn(),
      update: stageUpdate,
    }));

    const storage = new SupabaseSqlStorage();
    await storage.update(
      'stage',
      { id: 5 } as Partial<DataTypes['stage']>,
      {
        name: 'Updated stage',
      } as Partial<DataTypes['stage']>
    );

    expect(stageSelect).not.toHaveBeenCalled();
    expect(stageUpdateEq).toHaveBeenCalledWith('id', 5);
  });

  it('delete supports unfiltered and filtered eq-chain deletes', async () => {
    const filteredEq2 = vi.fn().mockResolvedValue({ error: null });
    const filteredEq1 = vi.fn().mockReturnValue({ eq: filteredEq2 });
    const deleteFn = vi
      .fn()
      .mockReturnValueOnce(Promise.resolve({ error: null }))
      .mockReturnValueOnce({ eq: filteredEq1 });

    mockFrom.mockReturnValue({ delete: deleteFn });

    const storage = new SupabaseSqlStorage();

    const allResult = await storage.delete('round');
    const filteredResult = await storage.delete('round', {
      stage_id: 10,
      group_id: 2,
    } as Partial<DataTypes['round']>);

    expect(allResult).toBe(true);
    expect(filteredResult).toBe(true);
    expect(filteredEq1).toHaveBeenCalledWith('stage_id', 10);
    expect(filteredEq2).toHaveBeenCalledWith('group_id', 2);
  });

  it('error paths: select/insert/update/delete throw and execute error logger branches', async () => {
    const selectError = { message: 'select failed', code: 'S001' };
    const insertError = { message: 'insert failed', code: 'I001' };
    const updateError = { message: 'update failed', code: 'U001' };
    const deleteError = { message: 'delete failed', code: 'D001' };

    const storage = new SupabaseSqlStorage();

    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: selectError }) })),
    });
    await expect(
      storage.select('stage', { tournament_id: 't2' } as Partial<DataTypes['stage']>)
    ).rejects.toEqual(selectError);
    expect(mockHandleDatabaseError).toHaveBeenCalledWith(
      selectError,
      'Failed to select from bracket table'
    );

    mockFrom.mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: null, error: insertError }),
      })),
    });
    await expect(storage.insert('stage', { name: 'S', number: 1 } as never)).rejects.toEqual(
      insertError
    );
    expect(mockErrorLog).toHaveBeenCalledWith('Insert failed for stage:', insertError);

    mockFrom.mockReturnValueOnce({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: updateError }) })),
    });
    await expect(
      storage.update(
        'stage',
        { id: 1 } as Partial<DataTypes['stage']>,
        {
          name: 'bad',
        } as Partial<DataTypes['stage']>
      )
    ).rejects.toEqual(updateError);
    expect(mockErrorLog).toHaveBeenCalledWith('Update failed for stage:', updateError);

    mockFrom.mockReturnValueOnce({
      delete: vi.fn().mockResolvedValue({ error: deleteError }),
    });
    await expect(storage.delete('stage')).rejects.toEqual(deleteError);
    expect(mockErrorLog).toHaveBeenCalledWith('Delete failed for stage:', deleteError);
  });
});
