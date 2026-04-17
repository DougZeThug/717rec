import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockStorageBucket = { list: vi.fn(), remove: vi.fn() };
const mockStorageFrom = vi.fn().mockReturnValue(mockStorageBucket);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    storage: { from: (bucket: string) => mockStorageFrom(bucket) },
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn(), teamLog: vi.fn(),
}));

// Import after mocks
import { deleteTeamApi } from '../TeamDeleteService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'db error') => ({
  message: msg, code: '42P01', details: null, hint: null, name: 'PostgrestError',
});

const deleteEqChain = (result: { error: unknown }) => ({
  delete: () => ({ eq: () => Promise.resolve(result) }),
});

// ─── deleteTeamApi ────────────────────────────────────────────────────────────

describe('deleteTeamApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageFrom.mockReturnValue(mockStorageBucket);
  });

  it('deletes team files then team record when files exist', async () => {
    const files = [{ name: 'logo.png' }, { name: 'image.jpg' }];
    mockStorageBucket.list.mockResolvedValue({ data: files, error: null });
    mockStorageBucket.remove.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(deleteEqChain({ error: null }));

    await deleteTeamApi('team-1');

    expect(mockStorageFrom).toHaveBeenCalledWith('teams');
    expect(mockStorageBucket.list).toHaveBeenCalledWith('teams/team-1');
    expect(mockStorageBucket.remove).toHaveBeenCalledWith([
      'teams/team-1/logo.png',
      'teams/team-1/image.jpg',
    ]);
    expect(mockFrom).toHaveBeenCalledWith('teams');
  });

  it('skips file deletion when no files exist', async () => {
    mockStorageBucket.list.mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue(deleteEqChain({ error: null }));

    await deleteTeamApi('team-1');

    expect(mockStorageBucket.remove).not.toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith('teams');
  });

  it('still deletes team record even when file delete fails', async () => {
    mockStorageBucket.list.mockResolvedValue({ data: [{ name: 'logo.png' }], error: null });
    mockStorageBucket.remove.mockResolvedValue({ data: null, error: { message: 'storage error' } });
    mockFrom.mockReturnValue(deleteEqChain({ error: null }));

    await expect(deleteTeamApi('team-1')).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('teams');
  });

  it('throws DatabaseError when team database delete fails', async () => {
    mockStorageBucket.list.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(deleteEqChain({ error: pgError() }));

    await expect(deleteTeamApi('team-1')).rejects.toThrow(DatabaseError);
  });
});
