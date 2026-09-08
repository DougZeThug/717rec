import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

import ResetPassword from '../ResetPassword';

const mockUpdatePassword = vi.fn();
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
  updatePassword: (...args: unknown[]) => mockUpdatePassword(...args),
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
    mockUpdatePassword.mockResolvedValue(undefined);
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
});
