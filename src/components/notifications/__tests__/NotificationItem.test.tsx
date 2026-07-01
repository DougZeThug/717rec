import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationRow } from '@/services/notifications/NotificationService';

const mockUseDeleteNotification = vi.hoisted(() => vi.fn());
const mockUseAdminAccess = vi.hoisted(() => vi.fn());
const mockMutate = vi.hoisted(() => vi.fn());
const mockFormatNotificationDate = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/notifications/useNotificationMutations', () => ({
  useDeleteNotification: () => mockUseDeleteNotification(),
}));
vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => mockUseAdminAccess(),
}));
vi.mock('@/utils/formatNotificationDate', () => ({
  formatNotificationDate: (iso: string | null | undefined) => mockFormatNotificationDate(iso),
}));

import NotificationItem from '../NotificationItem';

const notification: NotificationRow = {
  id: 'note-1',
  title: 'Season kickoff',
  body: 'First game is Saturday at 9am.',
  created_by: 'admin-1',
  created_at: '2026-06-30T14:00:00.000Z',
  updated_at: '2026-06-30T14:00:00.000Z',
  expires_at: null,
};

const getDot = (container: HTMLElement): HTMLElement => {
  const dot = container.querySelector('span.rounded-full');
  if (!(dot instanceof HTMLElement)) {
    throw new Error('Expected the unread-dot span to exist');
  }
  return dot;
};

describe('NotificationItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeleteNotification.mockReturnValue({ mutate: mockMutate, isPending: false });
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false });
    mockFormatNotificationDate.mockReturnValue({
      absolute: 'Jun 30, 2026, 10:00 AM EDT',
      relative: 'about 1 hour ago',
      iso: notification.created_at,
    });
  });

  it('renders the title, body and absolute/relative time from the formatter', () => {
    render(<NotificationItem notification={notification} lastSeenAt="2026-06-01T00:00:00.000Z" />);

    expect(screen.getByRole('heading', { name: 'Season kickoff' })).toBeInTheDocument();
    expect(screen.getByText('First game is Saturday at 9am.')).toBeInTheDocument();
    expect(screen.getByText('Jun 30, 2026, 10:00 AM EDT')).toBeInTheDocument();
    expect(screen.getByText('about 1 hour ago')).toBeInTheDocument();
    expect(mockFormatNotificationDate).toHaveBeenCalledWith(notification.created_at);
  });

  it('marks the dot as unread (bg-primary) when created after lastSeenAt', () => {
    const { container } = render(
      <NotificationItem notification={notification} lastSeenAt="2026-06-01T00:00:00.000Z" />
    );
    const dot = getDot(container);
    expect(dot).toHaveClass('bg-primary');
    expect(dot).not.toHaveClass('bg-transparent');
  });

  it('marks the dot as read (bg-transparent) when created before lastSeenAt', () => {
    const { container } = render(
      <NotificationItem notification={notification} lastSeenAt="2026-07-15T00:00:00.000Z" />
    );
    const dot = getDot(container);
    expect(dot).toHaveClass('bg-transparent');
    expect(dot).not.toHaveClass('bg-primary');
  });

  it('hides the delete control for non-admins', () => {
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false });
    render(<NotificationItem notification={notification} lastSeenAt="2026-06-01T00:00:00.000Z" />);

    expect(screen.queryByRole('button', { name: /delete notification/i })).not.toBeInTheDocument();
  });

  it('deletes by id when an admin clicks the delete control', async () => {
    const user = userEvent.setup();
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: true });

    render(<NotificationItem notification={notification} lastSeenAt="2026-06-01T00:00:00.000Z" />);

    await user.click(screen.getByRole('button', { name: /delete notification/i }));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith('note-1');
  });

  it('disables the delete control while a deletion is pending', () => {
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: true });
    mockUseDeleteNotification.mockReturnValue({ mutate: mockMutate, isPending: true });

    render(<NotificationItem notification={notification} lastSeenAt="2026-06-01T00:00:00.000Z" />);

    expect(screen.getByRole('button', { name: /delete notification/i })).toBeDisabled();
  });
});
