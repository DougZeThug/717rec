import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError, NotFoundError } from '@/types/errors';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

import { NotificationService } from '../NotificationService';

const pgError = (msg = 'boom') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NotificationService.fetchNotifications', () => {
  it('returns rows ordered by created_at desc with the given limit', async () => {
    const rows = [{ id: 'n1', title: 'Hello', body: 'World', created_at: '2026-05-21T18:00:00Z' }];
    const limit = vi.fn().mockResolvedValue({ data: rows, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    mockFrom.mockReturnValue({ select: () => ({ order }) });

    const result = await NotificationService.fetchNotifications(5);

    expect(mockFrom).toHaveBeenCalledWith('admin_notifications');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(5);
    expect(result).toEqual(rows);
  });

  it('returns [] when data is null', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => ({ limit: () => Promise.resolve({ data: null, error: null }) }) }),
    });
    expect(await NotificationService.fetchNotifications()).toEqual([]);
  });

  it('throws DatabaseError when the query fails', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => ({ limit: () => Promise.resolve({ data: null, error: pgError() }) }) }),
    });
    await expect(NotificationService.fetchNotifications()).rejects.toBeInstanceOf(DatabaseError);
  });
});

describe('NotificationService.createNotification', () => {
  it('inserts the payload and returns the created row', async () => {
    const created = {
      id: 'n2',
      title: 'T',
      body: 'B',
      created_by: 'user-1',
      expires_at: null,
      created_at: '2026-05-21T18:00:00Z',
      updated_at: '2026-05-21T18:00:00Z',
    };
    const maybeSingle = vi.fn().mockResolvedValue({ data: created, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const insert = vi.fn().mockReturnValue({ select });
    mockFrom.mockReturnValue({ insert });

    const result = await NotificationService.createNotification({
      title: 'T',
      body: 'B',
      createdBy: 'user-1',
    });

    expect(insert).toHaveBeenCalledWith({
      title: 'T',
      body: 'B',
      created_by: 'user-1',
      expires_at: null,
    });
    expect(result).toEqual(created);
  });

  it('throws NotFoundError when insert returns no row', async () => {
    mockFrom.mockReturnValue({
      insert: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    });
    await expect(
      NotificationService.createNotification({ title: 'T', body: 'B', createdBy: null })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws DatabaseError when insert errors', async () => {
    mockFrom.mockReturnValue({
      insert: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: pgError() }) }) }),
    });
    await expect(
      NotificationService.createNotification({ title: 'T', body: 'B', createdBy: null })
    ).rejects.toBeInstanceOf(DatabaseError);
  });
});

describe('NotificationService.updateNotification', () => {
  it('updates a row by id and returns the patched row', async () => {
    const updated = { id: 'n1', title: 'New', body: 'B' };
    const maybeSingle = vi.fn().mockResolvedValue({ data: updated, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    const result = await NotificationService.updateNotification('n1', { title: 'New' });

    expect(update).toHaveBeenCalledWith({ title: 'New' });
    expect(eq).toHaveBeenCalledWith('id', 'n1');
    expect(result).toEqual(updated);
  });

  it('throws NotFoundError when no row returned', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      }),
    });
    await expect(
      NotificationService.updateNotification('missing', { title: 'x' })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('NotificationService.deleteNotification', () => {
  it('deletes by id', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const del = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ delete: del });

    await NotificationService.deleteNotification('n1');

    expect(del).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith('id', 'n1');
  });

  it('throws DatabaseError on delete failure', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(NotificationService.deleteNotification('n1')).rejects.toBeInstanceOf(DatabaseError);
  });
});