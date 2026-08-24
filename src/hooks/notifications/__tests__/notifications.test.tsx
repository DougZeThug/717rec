import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  fetch: vi.fn(),
  toast: vi.fn(),
  subscribe: vi.fn(),
  dispose: vi.fn(),
  channel: vi.fn(),
  on: vi.fn(),
}));
vi.mock('@/services/notifications/NotificationService', () => ({
  NotificationService: {
    createNotification: mocks.create,
    updateNotification: mocks.update,
    deleteNotification: mocks.remove,
    fetchNotifications: mocks.fetch,
  },
}));
vi.mock('@/hooks/useToast', () => ({ toast: mocks.toast }));
vi.mock('@/hooks/realtime/subscribeWithRetry', () => ({ subscribeWithRetry: mocks.subscribe }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { channel: mocks.channel } }));

import {
  useCreateNotification,
  useDeleteNotification,
  useUpdateNotification,
} from '../useNotificationMutations';
import { NOTIFICATIONS_QUERY_KEY, useNotificationsQuery } from '../useNotificationsQuery';
import { useNotificationsRealtime } from '../useNotificationsRealtime';
import { useUnreadNotifications } from '../useUnreadNotifications';

const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
};

describe('notification hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.on.mockReturnThis();
    mocks.channel.mockReturnValue({ on: mocks.on });
    mocks.subscribe.mockReturnValue({ dispose: mocks.dispose });
  });

  it('fetches notifications with the limit and expected query key', async () => {
    mocks.fetch.mockResolvedValue([]);
    const { client, wrapper } = makeWrapper();
    const { result } = renderHook(() => useNotificationsQuery(7), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.fetch).toHaveBeenCalledWith(7);
    expect(client.getQueryState([...NOTIFICATIONS_QUERY_KEY, 7])).toBeDefined();
  });

  it.each([
    ['create', useCreateNotification, mocks.create, { title: 'New' }],
    ['update', useUpdateNotification, mocks.update, { id: 'n1', patch: { title: 'Edit' } }],
    ['delete', useDeleteNotification, mocks.remove, 'n1'],
  ] as const)(
    '%s mutation calls its service and invalidates the list',
    async (_name, hook, service, value) => {
      service.mockResolvedValue({});
      const { client, wrapper } = makeWrapper();
      const invalidate = vi.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => hook(), { wrapper });
      await act(async () => {
        await result.current.mutateAsync(value as never);
      });
      if (_name === 'update') expect(service).toHaveBeenCalledWith('n1', { title: 'Edit' });
      else expect(service).toHaveBeenCalledWith(value);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: NOTIFICATIONS_QUERY_KEY });
    }
  );

  it('shows an error toast when delete fails', async () => {
    mocks.remove.mockRejectedValue(new Error('no'));
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteNotification(), { wrapper });
    await expect(result.current.mutateAsync('n1')).rejects.toThrow('no');
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith({
        title: 'Failed to delete notification',
        variant: 'destructive',
      })
    );
  });

  it('subscribes, invalidates on changes and later reconnects, then disposes', () => {
    const { client, wrapper } = makeWrapper();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { unmount } = renderHook(() => useNotificationsRealtime(), { wrapper });
    const options = mocks.subscribe.mock.calls[0][0];
    options.build();
    expect(mocks.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'admin_notifications' },
      expect.any(Function)
    );
    mocks.on.mock.calls[0][2]();
    options.onReconnect(true);
    options.onReconnect(false);
    expect(invalidate).toHaveBeenCalledTimes(2);
    unmount();
    expect(mocks.dispose).toHaveBeenCalled();
  });

  it('counts unread items, marks them seen, and accepts cross-tab updates', () => {
    vi.setSystemTime(new Date('2026-01-03T00:00:00Z'));
    localStorage.setItem('717rec:notifications:lastSeenAt', '2026-01-01T00:00:00Z');
    mocks.fetch.mockResolvedValue([
      { id: '1', created_at: '2026-01-02T00:00:00Z' },
      { id: '2', created_at: '2025-12-31T00:00:00Z' },
    ]);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUnreadNotifications(), { wrapper });
    return waitFor(() => expect(result.current.unreadCount).toBe(1)).then(() => {
      act(() => result.current.markAllSeen());
      expect(result.current.unreadCount).toBe(0);
      expect(localStorage.getItem('717rec:notifications:lastSeenAt')).toBe(
        '2026-01-03T00:00:00.000Z'
      );
      act(() =>
        window.dispatchEvent(
          new StorageEvent('storage', { key: '717rec:notifications:lastSeenAt', newValue: null })
        )
      );
      expect(result.current.unreadCount).toBe(2);
      vi.useRealTimers();
    });
  });
});
