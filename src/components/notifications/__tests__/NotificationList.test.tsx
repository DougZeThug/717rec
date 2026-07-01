import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationRow } from '@/services/notifications/NotificationService';

// Polyfill ResizeObserver for jsdom (used by Radix ScrollArea internals)
globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  (class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof ResizeObserver);

const mockUseDeleteNotification = vi.hoisted(() => vi.fn());
const mockUseAdminAccess = vi.hoisted(() => vi.fn());
const mockMutate = vi.hoisted(() => vi.fn());

// NotificationList is prop-driven, but its child NotificationItem pulls these
// data hooks. Mock them so the real item renders and its delete wiring works.
vi.mock('@/hooks/notifications/useNotificationMutations', () => ({
  useDeleteNotification: () => mockUseDeleteNotification(),
}));
vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => mockUseAdminAccess(),
}));

import NotificationList from '../NotificationList';

const makeNotification = (id: string, title: string): NotificationRow => ({
  id,
  title,
  body: `Body for ${title}`,
  created_by: null,
  created_at: '2026-06-30T14:00:00.000Z',
  updated_at: '2026-06-30T14:00:00.000Z',
  expires_at: null,
});

const LAST_SEEN = '2026-06-01T00:00:00.000Z';

describe('NotificationList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeleteNotification.mockReturnValue({ mutate: mockMutate, isPending: false });
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false });
  });

  it('shows a loading message while loading with no notifications', () => {
    render(<NotificationList notifications={[]} lastSeenAt={LAST_SEEN} isLoading />);
    expect(screen.getByText(/Loading notifications/)).toBeInTheDocument();
    expect(screen.queryByText('No notifications yet.')).not.toBeInTheDocument();
  });

  it('shows the empty state when not loading and there are no notifications', () => {
    render(<NotificationList notifications={[]} lastSeenAt={LAST_SEEN} isLoading={false} />);
    expect(screen.getByText('No notifications yet.')).toBeInTheDocument();
    expect(screen.queryByText(/Loading notifications/)).not.toBeInTheDocument();
  });

  it('renders one item per notification with its title', () => {
    const notifications = [
      makeNotification('n-1', 'Game moved to Sunday'),
      makeNotification('n-2', 'Bring extra water'),
      makeNotification('n-3', 'Playoff bracket posted'),
    ];

    render(
      <NotificationList notifications={notifications} lastSeenAt={LAST_SEEN} isLoading={false} />
    );

    expect(screen.getByRole('heading', { name: 'Game moved to Sunday' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bring extra water' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Playoff bracket posted' })).toBeInTheDocument();
    // Empty / loading states must not be shown when there is data.
    expect(screen.queryByText('No notifications yet.')).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading notifications/)).not.toBeInTheDocument();
  });

  it('wires each item through so an admin can delete by id', async () => {
    const user = userEvent.setup();
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: true });

    const notifications = [
      makeNotification('n-1', 'Game moved to Sunday'),
      makeNotification('n-2', 'Bring extra water'),
    ];

    render(
      <NotificationList notifications={notifications} lastSeenAt={LAST_SEEN} isLoading={false} />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete notification/i });
    expect(deleteButtons).toHaveLength(2);

    await user.click(deleteButtons[1]);
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith('n-2');
  });
});
