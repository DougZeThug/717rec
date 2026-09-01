import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationRow } from '@/services/notifications/NotificationService';

const mockUseNotificationsQuery = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/notifications/useNotificationsQuery', () => ({
  useNotificationsQuery: () => mockUseNotificationsQuery(),
  NOTIFICATIONS_QUERY_KEY: ['admin-notifications'],
}));

vi.mock('@/hooks/notifications/useNotificationsRealtime', () => ({
  useNotificationsRealtime: () => undefined,
}));

vi.mock('@/hooks/notifications/useNotificationMutations', () => ({
  useCreateNotification: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateNotification: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteNotification: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ user: { id: 'admin-1' } }) }));
vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }));

import NotificationsTab from '../NotificationsTab';

const NOW = Date.parse('2026-09-01T12:00:00.000Z');

const notification = (expiresAt: string | null, id = 'n-1'): NotificationRow => ({
  id,
  title: 'Rain delay',
  body: 'Week 3 is postponed',
  created_by: null,
  created_at: '2026-08-30T12:00:00.000Z',
  updated_at: '2026-08-30T12:00:00.000Z',
  expires_at: expiresAt,
});

const renderTab = (currentTimeMs?: number) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <NotificationsTab currentTimeMs={currentTimeMs} />
    </QueryClientProvider>
  );
};

describe('NotificationsTab expiry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not tag a notification expired on the exact millisecond it expires', () => {
    mockUseNotificationsQuery.mockReturnValue({
      data: [notification(new Date(NOW).toISOString())],
      isLoading: false,
    });

    renderTab(NOW);

    expect(screen.queryByText('Expired')).not.toBeInTheDocument();
  });

  it('tags it expired once the clock is past it', () => {
    mockUseNotificationsQuery.mockReturnValue({
      data: [notification(new Date(NOW - 1).toISOString())],
      isLoading: false,
    });

    renderTab(NOW);

    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('schedules the short buffer for an expiry on the exact millisecond, not the fallback', () => {
    // The filter used to be `> now`, which dropped this row and left the badge
    // waiting for the 60s fallback tick.
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    mockUseNotificationsQuery.mockReturnValue({
      data: [notification(new Date(NOW).toISOString())],
      isLoading: false,
    });

    renderTab();

    const delays = setTimeoutSpy.mock.calls.map((call) => call[1]);
    expect(delays).toContain(1000);
    expect(delays).not.toContain(60_000);
  });

  it('re-arms after each tick, so a later expiry is noticed too', () => {
    mockUseNotificationsQuery.mockReturnValue({
      data: [
        notification(new Date(NOW + 2_000).toISOString(), 'n-1'),
        notification(new Date(NOW + 10_000).toISOString(), 'n-2'),
      ],
      isLoading: false,
    });

    renderTab();
    expect(screen.queryByText('Expired')).not.toBeInTheDocument();

    // Past the first expiry: one badge, and the effect scheduled another tick.
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(screen.getAllByText('Expired')).toHaveLength(1);

    // Past the second. Before the re-arm this never fired at all.
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getAllByText('Expired')).toHaveLength(2);
  });
});
