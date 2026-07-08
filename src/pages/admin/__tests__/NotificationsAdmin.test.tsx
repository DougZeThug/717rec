import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationRow } from '@/services/notifications/NotificationService';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUseNotificationsRealtime = vi.hoisted(() => vi.fn());
const mockUseNotificationsQuery = vi.hoisted(() => vi.fn());
const mockUseCreateNotification = vi.hoisted(() => vi.fn());
const mockUseUpdateNotification = vi.hoisted(() => vi.fn());
const mockUseDeleteNotification = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => vi.fn());
const mockCreateMutateAsync = vi.hoisted(() => vi.fn());
const mockUpdateMutateAsync = vi.hoisted(() => vi.fn());
const mockDeleteMutate = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock('@/hooks/notifications/useNotificationsRealtime', () => ({
  useNotificationsRealtime: () => mockUseNotificationsRealtime(),
}));
vi.mock('@/hooks/notifications/useNotificationsQuery', () => ({
  useNotificationsQuery: () => mockUseNotificationsQuery(),
}));
vi.mock('@/hooks/notifications/useNotificationMutations', () => ({
  useCreateNotification: () => mockUseCreateNotification(),
  useUpdateNotification: () => mockUseUpdateNotification(),
  useDeleteNotification: () => mockUseDeleteNotification(),
}));
vi.mock('@/hooks/useToast', () => ({
  toast: (payload: unknown) => mockToast(payload),
}));

import NotificationsAdmin from '../NotificationsAdmin';

const makeNotification = (id: string, title: string, body: string): NotificationRow => ({
  id,
  title,
  body,
  created_by: null,
  created_at: '2026-06-30T14:00:00.000Z',
  updated_at: '2026-06-30T14:00:00.000Z',
  expires_at: null,
});

describe('NotificationsAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'admin-1' } });
    mockUseNotificationsQuery.mockReturnValue({ data: [], isLoading: false });
    mockUseCreateNotification.mockReturnValue({
      mutateAsync: mockCreateMutateAsync,
      isPending: false,
    });
    mockUseUpdateNotification.mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    });
    mockUseDeleteNotification.mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    });
  });

  it('exits edit mode and clears fields when the edited notification is deleted', async () => {
    const user = userEvent.setup();
    const notification = makeNotification('n-1', 'Old title', 'Old body');

    const { rerender } = render(<NotificationsAdmin />);

    // Wait for the empty state to render, then simulate a notification arriving.
    await waitFor(() =>
      expect(screen.getByText('No notifications yet.')).toBeInTheDocument()
    );

    mockUseNotificationsQuery.mockReturnValue({
      data: [notification],
      isLoading: false,
    });
    rerender(<NotificationsAdmin />);

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByText('Edit notification')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Old title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Old body')).toBeInTheDocument();

    // Simulate realtime deletion: the notification disappears from the query result.
    mockUseNotificationsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
    rerender(<NotificationsAdmin />);

    await waitFor(() =>
      expect(screen.getByText('New notification')).toBeInTheDocument()
    );

    expect(screen.queryByText('Edit notification')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Old title')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Old body')).not.toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Notification deleted',
      description: 'The notification you were editing has been removed.',
      variant: 'destructive',
    });
  });

  it('saves an update using the current derived notification', async () => {
    const user = userEvent.setup();
    const notification = makeNotification('n-1', 'Old title', 'Old body');

    mockUseNotificationsQuery.mockReturnValue({
      data: [notification],
      isLoading: false,
    });
    mockUpdateMutateAsync.mockResolvedValueOnce({ ...notification, title: 'New title', body: 'New body' });

    render(<NotificationsAdmin />);

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const titleInput = screen.getByDisplayValue('Old title');
    const bodyInput = screen.getByDisplayValue('Old body');

    await user.clear(titleInput);
    await user.type(titleInput, 'New title');
    await user.clear(bodyInput);
    await user.type(bodyInput, 'New body');

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: 'n-1',
        patch: { title: 'New title', body: 'New body' },
      })
    );
    expect(mockToast).toHaveBeenCalledWith({ title: 'Notification updated' });
  });
});
