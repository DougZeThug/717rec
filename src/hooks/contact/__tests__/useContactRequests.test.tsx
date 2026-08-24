import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
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
    fetchAll: mocks.fetch,
    submit: mocks.submit,
    markResolved: mocks.resolve,
    reopen: mocks.reopen,
    remove: mocks.remove,
  },
}));
vi.mock('@/hooks/useToast', () => ({ toast: mocks.toast }));
vi.mock('@/hooks/realtime/subscribeWithRetry', () => ({ subscribeWithRetry: mocks.subscribe }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { channel: mocks.channel } }));
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
    mocks.on.mockReturnThis();
    mocks.channel.mockReturnValue({ on: mocks.on });
    mocks.subscribe.mockReturnValue({ dispose: mocks.dispose });
  });
  it('fetches and maintains a realtime subscription', async () => {
    mocks.fetch.mockResolvedValue([]);
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result, unmount } = renderHook(() => useContactRequests(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const options = mocks.subscribe.mock.calls[0][0];
    options.build();
    expect(mocks.fetch).toHaveBeenCalled();
    expect(mocks.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'contact_requests' },
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
    renderHook(() => useContactRequests(false), { wrapper });
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });
  it.each([
    [useSubmitContactRequest, mocks.submit, { email: 'a@b.com', message: 'Hi' }],
    [useMarkContactRequestResolved, mocks.resolve, { id: 'c1', userId: 'u1' }],
    [useReopenContactRequest, mocks.reopen, 'c1'],
    [useDeleteContactRequest, mocks.remove, 'c1'],
  ] as const)('calls the mutation service and invalidates', async (hook, service, value) => {
    service.mockResolvedValue({});
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => hook(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(value as never);
    });
    if (service === mocks.resolve) expect(service).toHaveBeenCalledWith('c1', 'u1');
    else expect(service).toHaveBeenCalledWith(value);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['contact-requests'] });
  });
  it('shows the specific error toast for failed admin mutations', async () => {
    mocks.reopen.mockRejectedValue(new Error('no'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useReopenContactRequest(), { wrapper });
    await expect(result.current.mutateAsync('c1')).rejects.toThrow();
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith({
        title: 'Failed to reopen contact request',
        variant: 'destructive',
      })
    );
  });
});
