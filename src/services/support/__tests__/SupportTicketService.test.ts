import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

import { SupportTicketService } from '../SupportTicketService';

const pgError = (message = 'boom', code = '42501') => ({
  message,
  code,
  details: null,
  hint: null,
  name: 'PostgrestError',
});

/** Build the .select().order().limit() chain fetchAll walks. */
const selectChain = (result: { data: unknown; error: unknown }) => {
  const limit = vi.fn().mockResolvedValue(result);
  const order = vi.fn().mockReturnValue({ limit });
  const select = vi.fn().mockReturnValue({ order });
  return { select, order, limit };
};

/** Build the .update().eq() chain the write methods walk. */
const updateChain = (result: { error: unknown }) => {
  const eq = vi.fn().mockResolvedValue(result);
  const update = vi.fn().mockReturnValue({ eq });
  return { update, eq };
};

const row = {
  id: 'ticket-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  subject: 'bug_report',
  message: 'The scores page will not load.',
  status: 'new',
  created_at: '2026-08-01T12:00:00.000Z',
};

describe('SupportTicketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAll', () => {
    it('returns tickets newest first from the support_tickets table', async () => {
      const chain = selectChain({ data: [row], error: null });
      mockFrom.mockReturnValue({ select: chain.select });

      await expect(SupportTicketService.fetchAll()).resolves.toEqual([row]);
      expect(mockFrom).toHaveBeenCalledWith('support_tickets');
      expect(chain.select).toHaveBeenCalledWith(
        'id, name, email, subject, message, status, created_at'
      );
      expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(chain.limit).toHaveBeenCalledWith(100);
    });

    it('honours a custom limit', async () => {
      const chain = selectChain({ data: [], error: null });
      mockFrom.mockReturnValue({ select: chain.select });

      await SupportTicketService.fetchAll(5);
      expect(chain.limit).toHaveBeenCalledWith(5);
    });

    it('returns an empty list when data comes back null', async () => {
      const chain = selectChain({ data: null, error: null });
      mockFrom.mockReturnValue({ select: chain.select });

      await expect(SupportTicketService.fetchAll()).resolves.toEqual([]);
    });

    it.each(['PGRST205', '42P01'])(
      'returns an empty list when the migration is not applied (%s)',
      async (code) => {
        // The table may not exist yet: migrations are applied to the live
        // project by hand. The inbox must still render its other source.
        const chain = selectChain({ data: null, error: pgError('missing table', code) });
        mockFrom.mockReturnValue({ select: chain.select });

        await expect(SupportTicketService.fetchAll()).resolves.toEqual([]);
      }
    );

    it('throws a DatabaseError for any other failure', async () => {
      const chain = selectChain({ data: null, error: pgError('denied', '42501') });
      mockFrom.mockReturnValue({ select: chain.select });

      await expect(SupportTicketService.fetchAll()).rejects.toBeInstanceOf(DatabaseError);
    });
  });

  describe('countNew', () => {
    const countChain = (result: { count: number | null; error: unknown }) => {
      const eq = vi.fn().mockResolvedValue(result);
      const select = vi.fn().mockReturnValue({ eq });
      return { select, eq };
    };

    it('counts unresolved tickets with a head-only query', async () => {
      const chain = countChain({ count: 3, error: null });
      mockFrom.mockReturnValue({ select: chain.select });

      await expect(SupportTicketService.countNew()).resolves.toBe(3);
      expect(mockFrom).toHaveBeenCalledWith('support_tickets');
      expect(chain.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
      expect(chain.eq).toHaveBeenCalledWith('status', 'new');
    });

    it('coerces a null count to 0', async () => {
      mockFrom.mockReturnValue({ select: countChain({ count: null, error: null }).select });
      await expect(SupportTicketService.countNew()).resolves.toBe(0);
    });

    it.each(['PGRST205', '42P01'])(
      'returns 0 when the migration is not applied (%s)',
      async (code) => {
        mockFrom.mockReturnValue({
          select: countChain({ count: null, error: pgError('missing table', code) }).select,
        });
        await expect(SupportTicketService.countNew()).resolves.toBe(0);
      }
    );

    it('throws a DatabaseError for any other failure', async () => {
      mockFrom.mockReturnValue({
        select: countChain({ count: null, error: pgError('denied', '42501') }).select,
      });
      await expect(SupportTicketService.countNew()).rejects.toBeInstanceOf(DatabaseError);
    });
  });

  describe('markResolved', () => {
    it('sets status to resolved for the given id', async () => {
      const chain = updateChain({ error: null });
      mockFrom.mockReturnValue({ update: chain.update });

      await SupportTicketService.markResolved('ticket-1');
      expect(mockFrom).toHaveBeenCalledWith('support_tickets');
      expect(chain.update).toHaveBeenCalledWith({ status: 'resolved' });
      expect(chain.eq).toHaveBeenCalledWith('id', 'ticket-1');
    });

    it('throws a DatabaseError when the update fails', async () => {
      const chain = updateChain({ error: pgError() });
      mockFrom.mockReturnValue({ update: chain.update });

      await expect(SupportTicketService.markResolved('ticket-1')).rejects.toBeInstanceOf(
        DatabaseError
      );
    });
  });

  describe('reopen', () => {
    it('sets status back to new for the given id', async () => {
      const chain = updateChain({ error: null });
      mockFrom.mockReturnValue({ update: chain.update });

      await SupportTicketService.reopen('ticket-1');
      expect(chain.update).toHaveBeenCalledWith({ status: 'new' });
      expect(chain.eq).toHaveBeenCalledWith('id', 'ticket-1');
    });

    it('throws a DatabaseError when the update fails', async () => {
      const chain = updateChain({ error: pgError() });
      mockFrom.mockReturnValue({ update: chain.update });

      await expect(SupportTicketService.reopen('ticket-1')).rejects.toBeInstanceOf(DatabaseError);
    });
  });

  it('exposes no delete method, because the table has no DELETE policy', () => {
    expect('remove' in SupportTicketService).toBe(false);
  });
});
