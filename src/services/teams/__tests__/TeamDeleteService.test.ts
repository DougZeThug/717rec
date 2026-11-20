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
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
  teamLog: vi.fn(),
}));

// Import after mocks
import { deleteTeamApi } from '../TeamDeleteService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'db error') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

// delete -> eq -> select resolves { data, error }
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockDelete = vi.fn();

const mockRowDelete = (result: { data: unknown; error: unknown }) => {
  mockSelect.mockResolvedValue(result);
  mockEq.mockReturnValue({ select: mockSelect });
  mockDelete.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ delete: mockDelete });
};

// ─── deleteTeamApi ────────────────────────────────────────────────────────────

describe('deleteTeamApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageFrom.mockReturnValue(mockStorageBucket);
  });

  it('deletes the team row first, then lists and removes its files', async () => {
    const files = [{ name: 'logo.png' }, { name: 'image.jpg' }];
    mockStorageBucket.list.mockResolvedValue({ data: files, error: null });
    mockStorageBucket.remove.mockResolvedValue({ data: null, error: null });
    mockRowDelete({ data: [{ id: 'team-1' }], error: null });

    await deleteTeamApi('team-1');

    expect(mockFrom).toHaveBeenCalledWith('teams');
    expect(mockEq).toHaveBeenCalledWith('id', 'team-1');
    expect(mockSelect).toHaveBeenCalledWith('id');
    expect(mockStorageFrom).toHaveBeenCalledWith('teams');
    expect(mockStorageBucket.list).toHaveBeenCalledWith('teams/team-1');
    expect(mockStorageBucket.remove).toHaveBeenCalledWith([
      'teams/team-1/logo.png',
      'teams/team-1/image.jpg',
    ]);

    // Order: row delete, then list, then remove
    const deleteOrder = mockSelect.mock.invocationCallOrder[0];
    const listOrder = mockStorageBucket.list.mock.invocationCallOrder[0];
    const removeOrder = mockStorageBucket.remove.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(listOrder);
    expect(listOrder).toBeLessThan(removeOrder);
  });

  it('throws DatabaseError and never touches storage when the row delete fails', async () => {
    mockStorageBucket.list.mockResolvedValue({ data: [{ name: 'logo.png' }], error: null });
    mockRowDelete({ data: null, error: pgError() });

    await expect(deleteTeamApi('team-1')).rejects.toThrow(DatabaseError);

    expect(mockStorageFrom).not.toHaveBeenCalled();
    expect(mockStorageBucket.list).not.toHaveBeenCalled();
    expect(mockStorageBucket.remove).not.toHaveBeenCalled();
  });

  it('resolves without touching storage when no row was deleted', async () => {
    mockRowDelete({ data: [], error: null });

    await expect(deleteTeamApi('team-1')).resolves.toBeUndefined();

    expect(mockStorageFrom).not.toHaveBeenCalled();
    expect(mockStorageBucket.list).not.toHaveBeenCalled();
    expect(mockStorageBucket.remove).not.toHaveBeenCalled();
  });

  it('still resolves when listing the files fails after the row delete', async () => {
    mockStorageBucket.list.mockResolvedValue({ data: null, error: { message: 'list error' } });
    mockRowDelete({ data: [{ id: 'team-1' }], error: null });

    await expect(deleteTeamApi('team-1')).resolves.toBeUndefined();

    expect(mockStorageBucket.remove).not.toHaveBeenCalled();
  });

  it('still resolves when removing the files fails after the row delete', async () => {
    mockStorageBucket.list.mockResolvedValue({ data: [{ name: 'logo.png' }], error: null });
    mockStorageBucket.remove.mockResolvedValue({ data: null, error: { message: 'storage error' } });
    mockRowDelete({ data: [{ id: 'team-1' }], error: null });

    await expect(deleteTeamApi('team-1')).resolves.toBeUndefined();

    expect(mockStorageBucket.remove).toHaveBeenCalledWith(['teams/team-1/logo.png']);
  });

  it('skips file removal when the team has no files', async () => {
    mockStorageBucket.list.mockResolvedValue({ data: [], error: null });
    mockRowDelete({ data: [{ id: 'team-1' }], error: null });

    await expect(deleteTeamApi('team-1')).resolves.toBeUndefined();

    expect(mockStorageBucket.list).toHaveBeenCalledWith('teams/team-1');
    expect(mockStorageBucket.remove).not.toHaveBeenCalled();
  });
});
