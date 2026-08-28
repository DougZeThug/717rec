import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  resolve: vi.fn(),
  reopen: vi.fn(),
  toast: vi.fn(),
  subscribe: vi.fn(),
  dispose: vi.fn(),
  channel: vi.fn(),
  on: vi.fn(),
}));
vi.mock('@/services/support/SupportTicketService', () => ({
  SupportTicketService: {
    fetchAll: mocks.fetch,
    markResolved: mocks.resolve,
    reopen: mocks.reopen,
  },
}));
vi.mock('@/hooks/useToast', () => ({ toast: mocks.toast }));
vi.mock('@/hooks/realtime/subscribeWithRetry', () => ({ subscribeWithRetry: mocks.subscribe }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { channel: mocks.channel } }));

import {
  useMarkSupportTicketResolved,
  useReopenSupportTicket,
  useSupportTickets,
} from '../useSupportTickets';

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
};

describe('support ticket hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.on.mockReturnThis();
    mocks.channel.mockReturnValue({ on: mocks.on });
    mocks.subscribe.mockReturnValue({ dispose: mocks.dispose });
  });

  it('fetches and maintains a realtime subscription', async () => {
    mocks.fetch.mockResolvedValue([]);
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result, unmount } = renderHook(() => useSupportTickets(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const options = mocks.subscribe.mock.calls[0][0];
    options.build();

    expect(mocks.fetch).toHaveBeenCalled();
    expect(mocks.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'support_tickets' },
      expect.any(Function)
    );

    mocks.on.mock.calls[0][2]();
    options.onReconnect(true);
    options.onReconnect(false);
    expect(invalidate).toHaveBeenCalledTimes(2);

    unmount();
    expect(mocks.dispose).toHaveBeenCalled();
  });

  it('does not fetch or subscribe when disabled', () => {
    const { wrapper } = setup();
    renderHook(() => useSupportTickets(false), { wrapper });
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });

  it.each([
    [useMarkSupportTicketResolved, mocks.resolve],
    [useReopenSupportTicket, mocks.reopen],
  ] as const)('calls the mutation service and invalidates', async (hook, service) => {
    service.mockImplementation(() => Promise.resolve());
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => hook(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('ticket-1');
    });

    expect(service).toHaveBeenCalledWith('ticket-1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['support-tickets'] });
  });

  it('shows the specific error toast for a failed reopen', async () => {
    mocks.reopen.mockRejectedValue(new Error('no'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useReopenSupportTicket(), { wrapper });

    await expect(result.current.mutateAsync('ticket-1')).rejects.toThrow();
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith({
        title: 'Failed to reopen support ticket',
        variant: 'destructive',
      })
    );
  });
});
