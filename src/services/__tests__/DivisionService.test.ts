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

// ─── deleteDivision ───────────────────────────────────────────────────────────

describe('DivisionService.deleteDivision', () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * Route each table to its own result. `counts` holds the row count of each
   * table the delete pre-checks; `deleteResult` is what the final delete returns.
   */
  const mockTables = (
    counts: Record<string, number>,
    deleteResult: { error: unknown } = { error: null }
  ) => {
    const deleted = vi.fn(() => Promise.resolve(deleteResult));
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: () => Promise.resolve({ count: counts[table] ?? 0, error: null }),
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
