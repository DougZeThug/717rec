import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationRow } from '@/services/notifications/NotificationService';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUseNotificationsRealtime = vi.hoisted(() => vi.fn());
const mockUseNotificationsQuery = vi.hoisted(() => vi.fn());
const mockUseCreateNotification = vi.hoisted(() => vi.fn());
const mockUseUpdateNotification = vi.hoisted(() => vi.fn());
const mockUseDeleteNotification = vi.hoisted(() => vi.fn());
const mockUseContactRequests = vi.hoisted(() => vi.fn());
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
vi.mock('@/hooks/contact/useContactRequests', () => ({
  useContactRequests: () => mockUseContactRequests(),
  useMarkContactRequestResolved: () => ({ mutate: vi.fn(), isPending: false }),
  useReopenContactRequest: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteContactRequest: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useToast', () => ({
  toast: (payload: unknown) => mockToast(payload),
}));

import NotificationsAdmin from '../NotificationsAdmin';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

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
    mockUseContactRequests.mockReturnValue({ data: [], isLoading: false });
  });

  it('asks before deleting a notification, and does nothing until confirmed', async () => {
    const user = userEvent.setup();
    mockUseNotificationsQuery.mockReturnValue({
      data: [makeNotification('n-1', 'Rain delay', 'Week 3 is postponed')],
      isLoading: false,
    });
    render(<NotificationsAdmin />, { wrapper: createWrapper() });

    await user.click(await screen.findByRole('button', { name: /delete notification/i }));

    expect(mockDeleteMutate).not.toHaveBeenCalled();
    expect(screen.getByText('Delete this notification?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(mockDeleteMutate).toHaveBeenCalledWith('n-1', expect.anything());
  });

  it('deletes nothing when the prompt is cancelled', async () => {
    const user = userEvent.setup();
    mockUseNotificationsQuery.mockReturnValue({
      data: [makeNotification('n-1', 'Rain delay', 'Week 3 is postponed')],
      isLoading: false,
    });
    render(<NotificationsAdmin />, { wrapper: createWrapper() });

    await user.click(await screen.findByRole('button', { name: /delete notification/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  it('exits edit mode and clears fields when the edited notification is deleted', async () => {
    const user = userEvent.setup();
    const notification = makeNotification('n-1', 'Old title', 'Old body');
    const Wrapper = createWrapper();

    const { rerender } = render(<NotificationsAdmin />, { wrapper: Wrapper });

    // Wait for the empty state to render, then simulate a notification arriving.
    await waitFor(() => expect(screen.getByText('No notifications yet.')).toBeInTheDocument());

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

    await waitFor(() => expect(screen.getByText('New notification')).toBeInTheDocument());

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
    mockUpdateMutateAsync.mockResolvedValueOnce({
      ...notification,
      title: 'New title',
      body: 'New body',
    });

    render(<NotificationsAdmin />, { wrapper: createWrapper() });

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
        patch: { title: 'New title', body: 'New body', expires_at: null },
      })
    );
    expect(mockToast).toHaveBeenCalledWith({ title: 'Notification updated' });
  });

  it('posts an expiry the admin typed, as a UTC timestamp', async () => {
    const user = userEvent.setup();
    mockUseNotificationsQuery.mockReturnValue({ data: [], isLoading: false });
    mockCreateMutateAsync.mockResolvedValueOnce(makeNotification('n-2', 'Rain', 'Off'));

    render(<NotificationsAdmin />, { wrapper: createWrapper() });

    await user.type(screen.getByLabelText('Title'), 'Rain');
    await user.type(screen.getByLabelText('Message'), 'Off');
    fireEvent.change(screen.getByLabelText(/expires \(optional\)/i), {
      target: { value: '2026-09-15T18:30' },
    });

    await user.click(screen.getByRole('button', { name: 'Post notification' }));

    await waitFor(() =>
      expect(mockCreateMutateAsync).toHaveBeenCalledWith({
        title: 'Rain',
        body: 'Off',
        createdBy: 'admin-1',
        expiresAt: new Date('2026-09-15T18:30').toISOString(),
      })
    );
  });

  it('posts once when the form is submitted twice in the same tick', async () => {
    mockUseNotificationsQuery.mockReturnValue({ data: [], isLoading: false });
    // Never settles, so the guard is the only thing that can stop the second call.
    mockCreateMutateAsync.mockImplementation(() => new Promise(() => undefined));

    render(<NotificationsAdmin />, { wrapper: createWrapper() });

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Rain' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Off' } });

    // Enter in the title submits, and the button's disable only lands on the
    // next render — so two submits can reach the handler before it does.
    const form = screen.getByRole('button', { name: 'Post notification' }).closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1));
  });

  it('loads an existing expiry into the form when editing, and clears it on cancel', async () => {
    const user = userEvent.setup();
    const notification = {
      ...makeNotification('n-1', 'Old title', 'Old body'),
      expires_at: new Date('2026-09-15T18:30').toISOString(),
    };

    mockUseNotificationsQuery.mockReturnValue({ data: [notification], isLoading: false });

    render(<NotificationsAdmin />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const expiryField = screen.getByLabelText(/expires \(optional\)/i);
    expect(expiryField).toHaveValue('2026-09-15T18:30');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText(/expires \(optional\)/i)).toHaveValue('');
  });
});
