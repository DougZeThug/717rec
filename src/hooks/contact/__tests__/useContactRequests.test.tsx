import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  fetch: vi.fn(),
  submit: vi.fn(),
  resolve: vi.fn(),
  reopen: vi.fn(),
  remove: vi.fn(),
  toast: vi.fn(),
  subscribe: vi.fn(),
  dispose: vi.fn(),
  channel: vi.fn(),
  on: vi.fn(),
}));
vi.mock('@/services/contact/ContactRequestService', () => ({
  ContactRequestService: {
    fetchAll: m.fetch,
    submit: m.submit,
    markResolved: m.resolve,
    reopen: m.reopen,
    remove: m.remove,
  },
}));
vi.mock('@/hooks/useToast', () => ({ toast: m.toast }));
vi.mock('@/hooks/realtime/subscribeWithRetry', () => ({ subscribeWithRetry: m.subscribe }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { channel: m.channel } }));
import {
  useContactRequests,
  useDeleteContactRequest,
  useMarkContactRequestResolved,
  useReopenContactRequest,
  useSubmitContactRequest,
} from '../useContactRequests';

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
};
describe('contact request hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.on.mockReturnThis();
    m.channel.mockReturnValue({ on: m.on });
    m.subscribe.mockReturnValue({ dispose: m.dispose });
  });
  it('fetches and maintains a realtime subscription', async () => {
    m.fetch.mockResolvedValue([]);
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result, unmount } = renderHook(() => useContactRequests(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const options = m.subscribe.mock.calls[0][0];
    options.build();
    expect(m.fetch).toHaveBeenCalled();
    expect(m.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'contact_requests' },
      expect.any(Function)
    );
    m.on.mock.calls[0][2]();
    options.onReconnect(true);
    options.onReconnect(false);
    expect(invalidate).toHaveBeenCalledTimes(2);
    unmount();
    expect(m.dispose).toHaveBeenCalled();
  });
  it('does not fetch or subscribe when disabled', () => {
    const { wrapper } = setup();
    renderHook(() => useContactRequests(false), { wrapper });
    expect(m.fetch).not.toHaveBeenCalled();
    expect(m.subscribe).not.toHaveBeenCalled();
  });
  it.each([
    [useSubmitContactRequest, m.submit, { email: 'a@b.com', message: 'Hi' }],
    [useMarkContactRequestResolved, m.resolve, { id: 'c1', userId: 'u1' }],
    [useReopenContactRequest, m.reopen, 'c1'],
    [useDeleteContactRequest, m.remove, 'c1'],
  ] as const)('calls the mutation service and invalidates', async (hook, service, value) => {
    service.mockResolvedValue({});
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => hook(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(value as never);
    });
    if (service === m.resolve) expect(service).toHaveBeenCalledWith('c1', 'u1');
    else expect(service).toHaveBeenCalledWith(value);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['contact-requests'] });
  });
  it('shows the specific error toast for failed admin mutations', async () => {
    m.reopen.mockRejectedValue(new Error('no'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useReopenContactRequest(), { wrapper });
    await expect(result.current.mutateAsync('c1')).rejects.toThrow();
    await waitFor(() =>
      expect(m.toast).toHaveBeenCalledWith({
        title: 'Failed to reopen contact request',
        variant: 'destructive',
      })
    );
  });
});
