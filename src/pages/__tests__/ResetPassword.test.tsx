import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

import ResetPassword from '../ResetPassword';

const mockUpdatePassword = vi.fn((_newPassword: string): Promise<void> => Promise.resolve());
const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/services/auth/AuthService', () => ({
  updatePassword: (newPassword: string) => mockUpdatePassword(newPassword),
}));

vi.mock('@/components/auth/AuthContainer', () => ({
  default: ({
    children,
    footer,
    title,
    description,
  }: {
    children: React.ReactNode;
    footer?: React.ReactNode;
    title?: string;
    description?: string;
  }) => (
    <div data-testid="auth-container">
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
      {footer}
    </div>
  ),
}));

vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const signedIn = {
  user: { id: 'u-1' },
  authInitialized: true,
  isLoading: false,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <ResetPassword />
    </MemoryRouter>
  );

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdatePassword.mockResolvedValue();
    mockUseAuth.mockReturnValue(signedIn);
  });

  it('waits rather than judging the link before auth has settled', () => {
    mockUseAuth.mockReturnValue({ user: null, authInitialized: false, isLoading: true });
    renderPage();

    expect(screen.getByText('Checking your reset link...')).toBeInTheDocument();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });

  // The recovery link signs the user in, so no session means the link is spent.
  it('explains an expired link instead of silently redirecting', () => {
    mockUseAuth.mockReturnValue({ user: null, authInitialized: true, isLoading: false });
    renderPage();

    expect(screen.getByText('This link has expired')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send a new link/i })).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // The recovery session means `user` is set. The page must not copy /auth's
  // "redirect away if signed in" rule, or nobody could ever set a password.
  it('shows the form to a user the recovery link signed in', () => {
    renderPage();

    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('refuses a password shorter than the sign-up rule', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('New password'), 'short');
    await user.type(screen.getByLabelText('Confirm new password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('refuses two passwords that do not match', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('New password'), 'hunter22');
    await user.type(screen.getByLabelText('Confirm new password'), 'hunter23');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  // The two fields used to share one error slot, and the slot sat under Confirm.
  // So "too short" — a complaint about the new password — was printed under a
  // confirmation that could be long enough, and marked that field red as well.
  describe('which field each complaint lands on', () => {
    const fieldOf = (input: HTMLElement) => input.closest('div');

    it('puts the length complaint on the new password, not on a valid Confirm', async () => {
      const user = userEvent.setup();
      renderPage();

      const newPassword = screen.getByLabelText('New password');
      const confirmPassword = screen.getByLabelText('Confirm new password');
      await user.type(newPassword, 'short');
      await user.type(confirmPassword, 'hunter22');
      await user.click(screen.getByRole('button', { name: 'Save new password' }));

      const message = await screen.findByText('Password must be at least 6 characters');
      expect(fieldOf(newPassword)).toContainElement(message);
      expect(fieldOf(confirmPassword)).not.toContainElement(message);
      expect(confirmPassword).not.toHaveClass('border-red-500');
      // The red border is for the eye; these two are what a screen reader reads.
      expect(newPassword).toHaveAttribute('aria-invalid', 'true');
      expect(newPassword).toHaveAccessibleDescription('Password must be at least 6 characters');
      expect(confirmPassword).not.toHaveAttribute('aria-invalid');
    });

    it('puts the mismatch on Confirm, where the value that has to change is', async () => {
      const user = userEvent.setup();
      renderPage();

      const newPassword = screen.getByLabelText('New password');
      const confirmPassword = screen.getByLabelText('Confirm new password');
      await user.type(newPassword, 'hunter22');
      await user.type(confirmPassword, 'hunter23');
      await user.click(screen.getByRole('button', { name: 'Save new password' }));

      const message = await screen.findByText('Passwords do not match');
      expect(fieldOf(confirmPassword)).toContainElement(message);
      expect(fieldOf(newPassword)).not.toContainElement(message);
      expect(newPassword).not.toHaveClass('border-red-500');
      expect(confirmPassword).toHaveAttribute('aria-invalid', 'true');
      expect(confirmPassword).toHaveAccessibleDescription('Passwords do not match');
      expect(newPassword).not.toHaveAttribute('aria-invalid');
    });

    it('clears a stale complaint from the other field on the next attempt', async () => {
      const user = userEvent.setup();
      renderPage();

      const newPassword = screen.getByLabelText('New password');
      const confirmPassword = screen.getByLabelText('Confirm new password');
      const save = screen.getByRole('button', { name: 'Save new password' });

      await user.type(newPassword, 'short');
      await user.type(confirmPassword, 'hunter22');
      await user.click(save);
      expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();

      // Long enough now, but still not a match: only the mismatch should show.
      await user.type(newPassword, 'er22');
      await user.click(save);

      expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
      expect(screen.queryByText('Password must be at least 6 characters')).not.toBeInTheDocument();
    });
  });

  it('saves the password and lands the user signed in', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('New password'), 'hunter22');
    await user.type(screen.getByLabelText('Confirm new password'), 'hunter22');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));

    await waitFor(() => expect(mockUpdatePassword).toHaveBeenCalledWith('hunter22'));
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('keeps the form and shows the reason when the save fails', async () => {
    const user = userEvent.setup();
    mockUpdatePassword.mockRejectedValue(new DatabaseError('session missing'));
    renderPage();

    await user.type(screen.getByLabelText('New password'), 'hunter22');
    await user.type(screen.getByLabelText('Confirm new password'), 'hunter22');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save new password' })).toBeEnabled();
  });

  it('sends the user back for a fresh link when this one is spent', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ user: null, authInitialized: true, isLoading: false });
    renderPage();

    await user.click(screen.getByRole('button', { name: /send a new link/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });
});
