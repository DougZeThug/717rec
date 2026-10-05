import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCheckUsernameAvailability = vi.hoisted(() => vi.fn());
const mockUpdateProfile = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/useToast', () => ({ toast: mockToast }));

vi.mock('@/services/profile/ProfileService', async () => {
  const actual = await vi.importActual<typeof import('@/services/profile/ProfileService')>(
    '@/services/profile/ProfileService'
  );
  return {
    ...actual,
    checkUsernameAvailability: (...args: unknown[]) => mockCheckUsernameAvailability(...args),
    updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  };
});

import ProfileForm from '../ProfileForm';

const renderForm = () =>
  render(<ProfileForm initialUsername="" initialFullName="" onProfileUpdated={vi.fn()} />);

// The name check is debounced by 500ms and then awaits a request. The default
// 1000ms find timeout leaves little headroom on a loaded CI worker, so every
// wait here is given room rather than relying on the default.
const SETTLE_TIMEOUT_MS = 5000;

const typeName = (name: string) =>
  userEvent.setup().type(screen.getByPlaceholderText('Enter your first name'), name);

describe('ProfileForm name availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockResolvedValue(true);
  });

  it('says in words that a name is available, not by a tick alone', async () => {
    mockCheckUsernameAvailability.mockResolvedValue({ available: true });
    renderForm();

    await typeName('Dougie');

    expect(
      await screen.findByText('Name is available', undefined, { timeout: SETTLE_TIMEOUT_MS })
    ).toBeInTheDocument();
  });

  it('leaves the taken case to the field error, so it is announced once', async () => {
    mockCheckUsernameAvailability.mockResolvedValue({ available: false });
    renderForm();

    await typeName('Dougie');

    // The form's own error is the single message; a second live region saying
    // the same thing made a screen reader announce it twice.
    expect(
      await screen.findByText('This name is already taken', undefined, {
        timeout: SETTLE_TIMEOUT_MS,
      })
    ).toBeInTheDocument();
    expect(screen.queryByText('Name is already taken')).not.toBeInTheDocument();
    expect(screen.queryByText('Name is available')).not.toBeInTheDocument();
  });

  it('says nothing before the name is long enough to check', async () => {
    mockCheckUsernameAvailability.mockResolvedValue({ available: true });
    renderForm();

    await typeName('Do');

    await waitFor(() => expect(mockCheckUsernameAvailability).not.toHaveBeenCalled(), {
      timeout: SETTLE_TIMEOUT_MS,
    });
    expect(screen.queryByText('Name is available')).not.toBeInTheDocument();
  });

  // The old guard compared names, so a slow check for "ABC" passed it again
  // once the user had typed away and back, and it overwrote the fresh answer.
  it('does not let a stale check overwrite a fresh one for the same name', async () => {
    let resolveSlow!: (value: { available: boolean | null }) => void;
    const slowCheck = new Promise<{ available: boolean | null }>((resolve) => {
      resolveSlow = resolve;
    });
    // 1st "ABC": slow, taken. "ABCX": fast, free. 2nd "ABC": fast, free.
    mockCheckUsernameAvailability
      .mockReturnValueOnce(slowCheck)
      .mockResolvedValueOnce({ available: true })
      .mockResolvedValueOnce({ available: true });

    renderForm();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText('Enter your first name');

    await user.type(input, 'ABC');
    await waitFor(() => expect(mockCheckUsernameAvailability).toHaveBeenCalledTimes(1), {
      timeout: SETTLE_TIMEOUT_MS,
    });
    await user.type(input, 'X');
    await waitFor(() => expect(mockCheckUsernameAvailability).toHaveBeenCalledTimes(2), {
      timeout: SETTLE_TIMEOUT_MS,
    });
    await user.type(input, '{Backspace}');
    await waitFor(() => expect(mockCheckUsernameAvailability).toHaveBeenCalledTimes(3), {
      timeout: SETTLE_TIMEOUT_MS,
    });

    expect(
      await screen.findByText('Name is available', undefined, { timeout: SETTLE_TIMEOUT_MS })
    ).toBeInTheDocument();

    await act(async () => {
      resolveSlow({ available: false });
      await slowCheck;
    });

    expect(screen.getByText('Name is available')).toBeInTheDocument();
    expect(screen.queryByText('This name is already taken')).not.toBeInTheDocument();
  });

  // The last check said "available" for the old value. An edit then a quick
  // submit, inside the 500ms debounce, used to save a name nobody checked.
  it('blocks a submit until the edited name has been checked', async () => {
    mockCheckUsernameAvailability.mockResolvedValue({ available: true });
    renderForm();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText('Enter your first name');

    await user.type(input, 'Dougie');
    expect(
      await screen.findByText('Name is available', undefined, { timeout: SETTLE_TIMEOUT_MS })
    ).toBeInTheDocument();
    expect(mockCheckUsernameAvailability).toHaveBeenCalledTimes(1);

    await user.type(input, 'X');
    // The green line must not vouch for the unchecked name.
    expect(screen.queryByText('Name is available')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save Profile' }));

    expect(mockCheckUsernameAvailability).toHaveBeenCalledTimes(1);
    expect(mockUpdateProfile).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Please wait for the name check to complete' })
    );
  });

  // A check that finished but could not answer (the service returns null on an
  // error) is not "still waiting". Save says so, asks again, and the next Save
  // works once the service is back.
  it('says the check failed, asks again, and saves once the name is verified', async () => {
    mockCheckUsernameAvailability
      .mockResolvedValueOnce({ available: null })
      .mockResolvedValue({ available: true });
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Enter your first name'), 'Dougie');
    await waitFor(() => expect(mockCheckUsernameAvailability).toHaveBeenCalledTimes(1), {
      timeout: SETTLE_TIMEOUT_MS,
    });
    await waitFor(() => expect(screen.queryByText('Name is available')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Save Profile' }));

    expect(mockUpdateProfile).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Couldn't check this name" })
    );
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Please wait for the name check to complete' })
    );
    // The second check runs on its own and passes.
    expect(
      await screen.findByText('Name is available', undefined, { timeout: SETTLE_TIMEOUT_MS })
    ).toBeInTheDocument();
    expect(mockCheckUsernameAvailability).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: 'Save Profile' }));
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith('user-1', {
        username: 'Dougie',
        fullName: '',
      })
    );
  });

  it('saves the edited name once its check has passed', async () => {
    mockCheckUsernameAvailability.mockResolvedValue({ available: true });
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Enter your first name'), 'Dougie');
    await screen.findByText('Name is available', undefined, { timeout: SETTLE_TIMEOUT_MS });
    await user.click(screen.getByRole('button', { name: 'Save Profile' }));

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith('user-1', {
        username: 'Dougie',
        fullName: '',
      })
    );
  });
  it('says the save failed, and keeps the form, when the update is rejected', async () => {
    mockCheckUsernameAvailability.mockResolvedValue({ available: true });
    mockUpdateProfile.mockRejectedValue(new Error('db down'));
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Enter your first name'), 'Dougie');
    await screen.findByText('Name is available', undefined, { timeout: SETTLE_TIMEOUT_MS });
    await user.click(screen.getByRole('button', { name: 'Save Profile' }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error updating profile', variant: 'destructive' })
      )
    );
    expect(screen.getByRole('button', { name: 'Save Profile' })).toBeInTheDocument();
  });
});
