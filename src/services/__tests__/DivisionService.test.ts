import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn(),
}));

// Import after mocks
import { DivisionService } from '../DivisionService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg, code: '42P01', details: null, hint: null, name: 'PostgrestError',
});

// .select().order()
const chain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ order: () => Promise.resolve(result) }),
});

// ─── fetchDivisions ───────────────────────────────────────────────────────────

describe('DivisionService.fetchDivisions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns divisions on success', async () => {
    const rows = [{ id: 'd1', name: 'Gold', division_weight: 0.9, display_division: 'Gold', created_at: '2026-01-01' }];
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
