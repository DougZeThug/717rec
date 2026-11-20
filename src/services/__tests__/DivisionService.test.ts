import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError, DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

// Import after mocks
import { DivisionService } from '../DivisionService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

// .select().order()
const chain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ order: () => Promise.resolve(result) }),
});

// ─── fetchDivisions ───────────────────────────────────────────────────────────

describe('DivisionService.fetchDivisions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns divisions on success', async () => {
    const rows = [
      {
        id: 'd1',
        name: 'Gold',
        division_weight: 0.9,
        display_division: 'Gold',
        created_at: '2026-01-01',
      },
    ];
    mockFrom.mockReturnValue(chain({ data: rows, error: null }));
    const result = await DivisionService.fetchDivisions();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Gold');
    expect(mockFrom).toHaveBeenCalledWith('divisions');
  });

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: null }));
    expect(await DivisionService.fetchDivisions()).toEqual([]);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: pgError() }));
    await expect(DivisionService.fetchDivisions()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchDivisionWeightsMap ──────────────────────────────────────────────────

describe('DivisionService.fetchDivisionWeightsMap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns division weight rows on success', async () => {
    const rows = [{ id: 'd1', name: 'Gold', division_weight: 0.9 }];
    mockFrom.mockReturnValue(chain({ data: rows, error: null }));
    const result = await DivisionService.fetchDivisionWeightsMap();
    expect(result).toHaveLength(1);
    expect(result[0].division_weight).toBe(0.9);
  });

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: null }));
    expect(await DivisionService.fetchDivisionWeightsMap()).toEqual([]);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: pgError() }));
    await expect(DivisionService.fetchDivisionWeightsMap()).rejects.toThrow(DatabaseError);
  });
});

// ─── createDivision ───────────────────────────────────────────────────────────

describe('DivisionService.createDivision', () => {
  beforeEach(() => vi.clearAllMocks());

  const createdRow = {
    id: 'd1',
    name: 'Gold',
    division_weight: 0.9,
    display_division: 'Competitive',
    created_at: '2026-01-01',
  };

  // insert -> select -> maybeSingle
  const mockInsert = (result: { data: unknown; error: unknown }) => {
    const maybeSingle = vi.fn(() => Promise.resolve(result));
    const select = vi.fn(() => ({ maybeSingle }));
    const insert = vi.fn(() => ({ select }));
    mockFrom.mockReturnValue({ insert });
    return { insert, select };
  };

  it('saves the trimmed name and returns the created row', async () => {
    const { insert, select } = mockInsert({ data: createdRow, error: null });

    const result = await DivisionService.createDivision({
      name: '  Gold  ',
      display_division: 'Competitive',
      division_weight: 0.9,
    });

    expect(result).toEqual(createdRow);
    expect(mockFrom).toHaveBeenCalledWith('divisions');
    expect(insert).toHaveBeenCalledWith({
      name: 'Gold',
      display_division: 'Competitive',
      division_weight: 0.9,
    });
    expect(select).toHaveBeenCalledWith('id, name, division_weight, display_division, created_at');
  });

  it('throws DatabaseError when the insert fails', async () => {
    mockInsert({ data: null, error: pgError() });

    await expect(
      DivisionService.createDivision({
        name: 'Gold',
        display_division: 'Competitive',
        division_weight: 0.9,
      })
    ).rejects.toThrow(DatabaseError);
  });

  // The defect: row-level security refuses the insert without an error. The
  // call came back as null and the admin saw "Division created" while nothing
  // was created.
  it('throws BusinessLogicError when no row came back', async () => {
    mockInsert({ data: null, error: null });

    const thrown = await DivisionService.createDivision({
      name: 'Gold',
      display_division: 'Competitive',
      division_weight: 0.9,
    }).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(BusinessLogicError);
    expect((thrown as Error).message).toMatch(/Nothing was created. Your admin access/);
  });
});

// ─── updateDivision ───────────────────────────────────────────────────────────

describe('DivisionService.updateDivision', () => {
  beforeEach(() => vi.clearAllMocks());

  const savedRow = {
    id: 'd1',
    name: 'Gold',
    division_weight: 0.9,
    display_division: 'Competitive',
    created_at: '2026-01-01',
  };

  // update -> eq -> select -> maybeSingle
  const mockUpdate = (result: { data: unknown; error: unknown }) => {
    const maybeSingle = vi.fn(() => Promise.resolve(result));
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ update });
    return { update, eq, select };
  };

  it('saves the trimmed name and the weight, and returns the saved row', async () => {
    const { update, eq, select } = mockUpdate({ data: savedRow, error: null });

    const result = await DivisionService.updateDivision('d1', {
      name: '  Gold  ',
      display_division: 'Competitive',
      division_weight: 0.9,
    });

    expect(result).toEqual(savedRow);
    expect(mockFrom).toHaveBeenCalledWith('divisions');
    expect(update).toHaveBeenCalledWith({
      name: 'Gold',
      display_division: 'Competitive',
      division_weight: 0.9,
    });
    expect(eq).toHaveBeenCalledWith('id', 'd1');
    expect(select).toHaveBeenCalledWith('id, name, division_weight, display_division, created_at');
  });

  it('sends only the fields it is given', async () => {
    const { update } = mockUpdate({ data: savedRow, error: null });

    await DivisionService.updateDivision('d1', { division_weight: 0.8 });

    expect(update).toHaveBeenCalledWith({ division_weight: 0.8 });
  });

  it('throws DatabaseError when the update fails', async () => {
    mockUpdate({ data: null, error: pgError() });

    await expect(DivisionService.updateDivision('d1', { division_weight: 0.8 })).rejects.toThrow(
      DatabaseError
    );
  });

  // The defect: row-level security hides the row without an error, or the
  // division was deleted. The save came back as null and the admin saw
  // "Division updated" while nothing was saved.
  it('throws BusinessLogicError when no row was updated', async () => {
    mockUpdate({ data: null, error: null });

    const thrown = await DivisionService.updateDivision('d1', { division_weight: 0.8 }).catch(
      (error: unknown) => error
    );

    expect(thrown).toBeInstanceOf(BusinessLogicError);
    expect((thrown as Error).message).toMatch(/Nothing was saved. This division/);
  });
});

// ─── deleteDivision ───────────────────────────────────────────────────────────

describe('DivisionService.deleteDivision', () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * Route each table to its own result. `counts` holds the row count of each
   * table the delete pre-checks; `deleteResult` is what the final delete returns.
   */
  const mockTables = (
    counts: Record<string, number>,
    deleteResult: { error: unknown } = { error: null },
    closed: Record<string, number> = {}
  ) => {
    const deleted = vi.fn(() => Promise.resolve(deleteResult));
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        // A plain count resolves to counts[table]. Chaining .not('valid_to', ...)
        // narrows it to closed rows, which the test gives as `closed[table]`.
        eq: () =>
          Object.assign(Promise.resolve({ count: counts[table] ?? 0, error: null }), {
            not: () => Promise.resolve({ count: closed[table] ?? 0, error: null }),
          }),
      }),
      delete: () => ({ eq: deleted }),
    }));
    return deleted;
  };

  it('deletes a division nothing refers to', async () => {
    const deleted = mockTables({});

    await expect(DivisionService.deleteDivision('d1')).resolves.toBeUndefined();

    expect(deleted).toHaveBeenCalledWith('id', 'd1');
  });

  it('refuses a division that teams use', async () => {
    const deleted = mockTables({ teams: 2 });

    await expect(DivisionService.deleteDivision('d1')).rejects.toThrow(
      'Division is in use by 2 teams and cannot be deleted.'
    );
    expect(deleted).not.toHaveBeenCalled();
  });

  it('refuses a division that brackets use', async () => {
    const deleted = mockTables({ brackets: 1 });

    await expect(DivisionService.deleteDivision('d1')).rejects.toThrow(
      'Division is in use by 1 bracket and cannot be deleted.'
    );
    expect(deleted).not.toHaveBeenCalled();
  });

  // The defect: snapshots hold a NO ACTION foreign key to divisions, so a
  // division with only snapshots left passed both checks and the database
  // refused the delete with a generic "still linked" error.
  it('names power-score snapshots when only they block the delete', async () => {
    const deleted = mockTables({ power_score_snapshots: 4 });

    const thrown = await DivisionService.deleteDivision('d1').catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(BusinessLogicError);
    expect((thrown as Error).message).toContain('power-score snapshots');
    expect(deleted).not.toHaveBeenCalled();
  });

  // team_division_history cascades on division delete, so without this check an
  // admin would silently erase which division each team played in.
  it('refuses a division that has team-division history', async () => {
    const deleted = mockTables({ team_division_history: 3 });

    const thrown = await DivisionService.deleteDivision('d1').catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(BusinessLogicError);
    expect((thrown as Error).message).toBe(
      'Division has team-division history and cannot be deleted.'
    );
    expect(deleted).not.toHaveBeenCalled();
  });

  it('deletes once the history count is zero', async () => {
    const deleted = mockTables({ team_division_history: 0 });

    await expect(DivisionService.deleteDivision('d1')).resolves.toBeUndefined();

    expect(deleted).toHaveBeenCalledWith('id', 'd1');
  });

  it('throws DatabaseError when the history check fails', async () => {
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: () =>
          Promise.resolve(
            table === 'team_division_history'
              ? { count: null, error: pgError() }
              : { count: 0, error: null }
          ),
      }),
    }));

    await expect(DivisionService.deleteDivision('d1')).rejects.toThrow(DatabaseError);
  });

  // team_details_archive has no foreign key, so the database never blocks the
  // delete. Without this check the archived season would name a missing division.
  it('refuses a division that archived season data names', async () => {
    const deleted = mockTables({ team_details_archive: 5 });

    const thrown = await DivisionService.deleteDivision('d1').catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(BusinessLogicError);
    expect((thrown as Error).message).toBe(
      'Division is used by archived season data and cannot be deleted.'
    );
    expect(deleted).not.toHaveBeenCalled();
  });

  it('deletes once the archived-data count is zero', async () => {
    const deleted = mockTables({ team_details_archive: 0 });

    await expect(DivisionService.deleteDivision('d1')).resolves.toBeUndefined();

    expect(deleted).toHaveBeenCalledWith('id', 'd1');
  });

  it('throws DatabaseError when the archived-data check fails', async () => {
    const deleted = vi.fn();
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: () =>
          Promise.resolve(
            table === 'team_details_archive'
              ? { count: null, error: pgError() }
              : { count: 0, error: null }
          ),
      }),
      delete: () => ({ eq: deleted }),
    }));

    await expect(DivisionService.deleteDivision('d1')).rejects.toThrow(DatabaseError);
    expect(deleted).not.toHaveBeenCalled();
  });

  // A trigger gives every new division one open weight row, so a plain row
  // count would block every delete. Only closed rows (an edited weight) count.
  it('refuses a division whose weight was edited', async () => {
    const deleted = mockTables(
      { division_weight_history: 2 },
      { error: null },
      { division_weight_history: 1 }
    );

    const thrown = await DivisionService.deleteDivision('d1').catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(BusinessLogicError);
    expect((thrown as Error).message).toBe('Division has weight history and cannot be deleted.');
    expect(deleted).not.toHaveBeenCalled();
  });

  it('deletes a division that has only its one open weight row', async () => {
    const deleted = mockTables(
      { division_weight_history: 1 },
      { error: null },
      { division_weight_history: 0 }
    );

    await expect(DivisionService.deleteDivision('d1')).resolves.toBeUndefined();

    expect(deleted).toHaveBeenCalledWith('id', 'd1');
  });

  it('throws DatabaseError when the weight history check fails', async () => {
    const deleted = vi.fn();
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: () =>
          Object.assign(Promise.resolve({ count: 0, error: null }), {
            not: () =>
              Promise.resolve(
                table === 'division_weight_history'
                  ? { count: null, error: pgError() }
                  : { count: 0, error: null }
              ),
          }),
      }),
      delete: () => ({ eq: deleted }),
    }));

    await expect(DivisionService.deleteDivision('d1')).rejects.toThrow(DatabaseError);
    expect(deleted).not.toHaveBeenCalled();
  });

  it('throws DatabaseError when the snapshot check fails', async () => {
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: () =>
          Promise.resolve(
            table === 'power_score_snapshots'
              ? { count: null, error: pgError() }
              : { count: 0, error: null }
          ),
      }),
    }));

    await expect(DivisionService.deleteDivision('d1')).rejects.toThrow(DatabaseError);
  });
});
