import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

import { ContactRequestService } from '../ContactRequestService';

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

// ─── submit ────────────────────────────────────────────────────────────────────

describe('ContactRequestService.submit', () => {
  it('invokes the edge function with the payload', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { success: true }, error: null });

    await ContactRequestService.submit({
      request_type: 'general',
      submitter_name: 'Jane',
      submitter_contact: 'jane@example.com',
      message: 'hi',
    });

    expect(mockInvoke).toHaveBeenCalledWith('submit-contact-request', {
      body: {
        request_type: 'general',
        submitter_name: 'Jane',
        submitter_contact: 'jane@example.com',
        message: 'hi',
      },
    });
  });

  it('throws when the edge function returns an error', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: { message: 'rate limited' } });

    await expect(
      ContactRequestService.submit({
        request_type: 'general',
        submitter_name: 'Jane',
        submitter_contact: 'jane@example.com',
        message: 'hi',
      })
    ).rejects.toThrow('rate limited');
  });
});

// ─── fetchAll ──────────────────────────────────────────────────────────────────

describe('ContactRequestService.fetchAll', () => {
  it('returns ordered rows on success', async () => {
    const rows = [{ id: 'r1', status: 'new', request_type: 'general' }];
    const limit = vi.fn().mockResolvedValue({ data: rows, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const select = vi.fn().mockReturnValue({ order });
    mockFrom.mockReturnValue({ select });

    const result = await ContactRequestService.fetchAll(50);

    expect(mockFrom).toHaveBeenCalledWith('contact_requests');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(50);
    expect(result).toEqual(rows);
  });

  it('throws DatabaseError when the query fails', async () => {
    const limit = vi.fn().mockResolvedValue({ data: null, error: pgError() });
    mockFrom.mockReturnValue({
      select: () => ({ order: () => ({ limit }) }),
    });

    await expect(ContactRequestService.fetchAll()).rejects.toBeInstanceOf(DatabaseError);
  });

  it('returns [] when data is null without an error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => ({ limit: () => Promise.resolve({ data: null, error: null }) }),
      }),
    });
    const result = await ContactRequestService.fetchAll();
    expect(result).toEqual([]);
  });
});

// ─── markResolved / reopen / remove ───────────────────────────────────────────

describe('ContactRequestService write methods', () => {
  it('markResolved updates status and timestamps', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    await ContactRequestService.markResolved('req-1', 'admin-9');

    expect(update).toHaveBeenCalledTimes(1);
    const patch = update.mock.calls[0][0];
    expect(patch.status).toBe('resolved');
    expect(patch.resolved_by).toBe('admin-9');
    expect(typeof patch.resolved_at).toBe('string');
    expect(eq).toHaveBeenCalledWith('id', 'req-1');
  });

  it('reopen clears resolved fields', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    await ContactRequestService.reopen('req-2');

    expect(update).toHaveBeenCalledWith({
      status: 'new',
      resolved_by: null,
      resolved_at: null,
    });
    expect(eq).toHaveBeenCalledWith('id', 'req-2');
  });

  it('remove deletes the row by id', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const del = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ delete: del });

    await ContactRequestService.remove('req-3');

    expect(del).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith('id', 'req-3');
  });

  it('throws DatabaseError when remove fails', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: pgError() }) }),
    });

    await expect(ContactRequestService.remove('req-3')).rejects.toBeInstanceOf(DatabaseError);
  });
});
