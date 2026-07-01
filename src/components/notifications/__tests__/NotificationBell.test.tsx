import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UseUnreadNotificationsResult } from '@/hooks/notifications/useUnreadNotifications';
import type { NotificationRow } from '@/services/notifications/NotificationService';

const mockUseUnreadNotifications = vi.hoisted(() => vi.fn());
const mockUseAdminAccess = vi.hoisted(() => vi.fn());
const mockUseNotificationsRealtime = vi.hoisted(() => vi.fn());
const mockMarkAllSeen = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/notifications/useNotificationsRealtime', () => ({
  useNotificationsRealtime: () => mockUseNotificationsRealtime(),
}));
vi.mock('@/hooks/notifications/useUnreadNotifications', () => ({
  useUnreadNotifications: () => mockUseUnreadNotifications(),
}));
vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => mockUseAdminAccess(),
}));

// Stub children so their own data hooks are never pulled into this render.
vi.mock('../NotificationList', () => ({
  default: ({ notifications }: { notifications: NotificationRow[] }) => (
    <div data-testid="notification-list-stub">list:{notifications.length}</div>
  ),
}));
vi.mock('../QuickPostNotificationForm', () => ({
  default: () => <div data-testid="quick-post-stub">quick post form</div>,
}));

import NotificationBell from '../NotificationBell';

const makeNotification = (id: string): NotificationRow => ({
  id,
  title: `Title ${id}`,
  body: `Body ${id}`,
  created_by: null,
  created_at: '2026-06-30T10:00:00.000Z',
  updated_at: '2026-06-30T10:00:00.000Z',
  expires_at: null,
});

const setUnread = (overrides: Partial<UseUnreadNotificationsResult> = {}) => {
  const value: UseUnreadNotificationsResult = {
    notifications: [makeNotification('a'), makeNotification('b')],
    unreadCount: 3,
    lastSeenAt: '2026-06-01T00:00:00.000Z',
    isLoading: false,
    markAllSeen: mockMarkAllSeen,
    ...overrides,
  };
  mockUseUnreadNotifications.mockReturnValue(value);
};

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUnread();
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false });
  });

  it('subscribes to realtime updates on render', () => {
    render(<NotificationBell />);
    expect(mockUseNotificationsRealtime).toHaveBeenCalled();
  });

  it('shows an unread badge and count-annotated aria-label when there are unread items', () => {
    setUnread({ unreadCount: 3 });
    render(<NotificationBell />);

    expect(screen.getByRole('button', { name: 'Notifications (3 unread)' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('caps the badge at 9+ when there are more than nine unread items', () => {
    setUnread({ unreadCount: 12 });
    render(<NotificationBell />);

    expect(screen.getByRole('button', { name: 'Notifications (12 unread)' })).toBeInTheDocument();
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('renders a plain aria-label and no badge when there are no unread items', () => {
    setUnread({ unreadCount: 0, notifications: [] });
    render(<NotificationBell />);

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByText('9+')).not.toBeInTheDocument();
    // No numeric badge for a zero count.
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('marks all seen and reveals the panel (incl. admin form) when opened with unread items', async () => {
    const user = userEvent.setup();
    setUnread({ unreadCount: 3 });
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: true });

    render(<NotificationBell />);

    await user.click(screen.getByRole('button', { name: 'Notifications (3 unread)' }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    );
    expect(mockMarkAllSeen).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('quick-post-stub')).toBeInTheDocument();
    expect(screen.getByTestId('notification-list-stub')).toBeInTheDocument();
    expect(screen.getByText('2 recent')).toBeInTheDocument();
  });

  it('hides the admin quick-post form for non-admins', async () => {
    const user = userEvent.setup();
    setUnread({ unreadCount: 3 });
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false });

    render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: 'Notifications (3 unread)' }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    );
    expect(screen.queryByTestId('quick-post-stub')).not.toBeInTheDocument();
  });

  it('does NOT mark all seen when opened with a zero unread count', async () => {
    const user = userEvent.setup();
    setUnread({ unreadCount: 0, notifications: [] });

    render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    );
    expect(mockMarkAllSeen).not.toHaveBeenCalled();
  });
});
