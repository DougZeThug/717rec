import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, args: unknown) => mockRpc(fn, args),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
  teamLog: vi.fn(),
}));

// Import after mocks
import { bulkUpdateTeamSeeds, resetDivisionSeeds, updateTeamSeed } from '../TeamSeedService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'rpc failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

// ─── updateTeamSeed ───────────────────────────────────────────────────────────

describe('updateTeamSeed', () => {
  beforeEach(() => vi.clearAllMocks());

  // .update().eq().select().single()
  const updateChain = (result: { data: unknown; error: unknown }) => ({
    update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve(result) }) }) }),
  });

  it('returns updated row on success', async () => {
    const row = { id: 'team-1', seed: 3 };
    mockFrom.mockReturnValue(updateChain({ data: row, error: null }));
    const result = await updateTeamSeed('team-1', 3);
    expect(result).toEqual(row);
    expect(mockFrom).toHaveBeenCalledWith('teams');
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(updateChain({ data: null, error: pgError() }));
    await expect(updateTeamSeed('team-1', 3)).rejects.toThrow(DatabaseError);
  });
});

// ─── bulkUpdateTeamSeeds ──────────────────────────────────────────────────────

describe('bulkUpdateTeamSeeds', () => {
  beforeEach(() => vi.clearAllMocks());

  const updates = [
    { teamId: 'team-1', seed: 1 },
    { teamId: 'team-2', seed: 2 },
  ];

  it('calls batch_update_team_seeds RPC and returns results', async () => {
    mockRpc.mockResolvedValue({ data: { results: [{ success: true }] }, error: null });
    const result = await bulkUpdateTeamSeeds(updates);
    expect(mockRpc).toHaveBeenCalledWith('batch_update_team_seeds', expect.any(Object));
    expect(result).toEqual([{ success: true }]);
  });

  it('returns empty array when data has no results key', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const result = await bulkUpdateTeamSeeds(updates);
    expect(result).toEqual([]);
  });

  it('throws DatabaseError on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(bulkUpdateTeamSeeds(updates)).rejects.toThrow(DatabaseError);
  });
});

// ─── resetDivisionSeeds ───────────────────────────────────────────────────────

describe('resetDivisionSeeds', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves without error on success', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await expect(resetDivisionSeeds('div-1')).resolves.toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith('reset_division_seeds', { p_division_id: 'div-1' });
  });

  it('throws DatabaseError on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(resetDivisionSeeds('div-1')).rejects.toThrow(DatabaseError);
  });
});
