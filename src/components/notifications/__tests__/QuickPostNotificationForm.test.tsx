import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockMutateAsync = vi.hoisted(() => vi.fn());
const mockUseCreateNotification = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock('@/hooks/notifications/useNotificationMutations', () => ({
  useCreateNotification: () => mockUseCreateNotification(),
}));
vi.mock('@/hooks/useToast', () => ({
  toast: (payload: unknown) => mockToast(payload),
}));

import QuickPostNotificationForm from '../QuickPostNotificationForm';

describe('QuickPostNotificationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'admin-1' } });
    mockUseCreateNotification.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  const getSubmitButton = () => screen.getByRole('button', { name: 'Post' });

  it('renders the title and message fields with the submit button disabled while empty', () => {
    render(<QuickPostNotificationForm />);

    expect(screen.getByPlaceholderText('Title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Message')).toBeInTheDocument();
    expect(getSubmitButton()).toBeDisabled();
  });

  it('enables submit, posts the notification, shows a success toast, and resets the fields', async () => {
    const user = userEvent.setup();
    render(<QuickPostNotificationForm />);

    const titleInput = screen.getByPlaceholderText('Title');
    const messageInput = screen.getByPlaceholderText('Message');

    // Only a title is not enough to enable submit.
    await user.type(titleInput, 'Field closed tonight');
    expect(getSubmitButton()).toBeDisabled();

    await user.type(messageInput, 'Games are cancelled due to rain.');
    expect(getSubmitButton()).toBeEnabled();

    await user.click(getSubmitButton());

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        title: 'Field closed tonight',
        body: 'Games are cancelled due to rain.',
        createdBy: 'admin-1',
      })
    );
    expect(mockToast).toHaveBeenCalledWith({ title: 'Notification posted' });

    // Fields reset to empty after a successful post.
    await waitFor(() => expect(titleInput).toHaveValue(''));
    expect(messageInput).toHaveValue('');
  });

  it('shows a destructive toast when the mutation rejects', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValueOnce(new Error('network down'));
    render(<QuickPostNotificationForm />);

    await user.type(screen.getByPlaceholderText('Title'), 'Heads up');
    await user.type(screen.getByPlaceholderText('Message'), 'Something to know');
    await user.click(getSubmitButton());

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to post notification',
        description: 'network down',
        variant: 'destructive',
      })
    );
    // On failure the success toast never fires and the fields keep their values.
    expect(mockToast).not.toHaveBeenCalledWith({ title: 'Notification posted' });
    expect(screen.getByPlaceholderText('Title')).toHaveValue('Heads up');
  });
});
