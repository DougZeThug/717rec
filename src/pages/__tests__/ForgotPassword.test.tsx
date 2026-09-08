import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

import ForgotPassword from '../ForgotPassword';

const mockResetPassword = vi.fn((_email: string, _redirectTo: string): Promise<void> =>
  Promise.resolve()
);

vi.mock('@/services/auth/AuthService', () => ({
  resetPassword: (email: string, redirectTo: string) => mockResetPassword(email, redirectTo),
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

const renderPage = () =>
  render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>
  );

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResetPassword.mockResolvedValue();
  });

  it('refuses an address that is not an email and sends nothing', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('sends the link back to the reset page on this origin', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'player@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() =>
      expect(mockResetPassword).toHaveBeenCalledWith(
        'player@example.com',
        `${window.location.origin}/reset-password`
      )
    );
  });

  it('never reveals whether the address has an account', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'player@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    // "If an account exists", not "Email sent".
    expect(await screen.findByText(/if an account exists for/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send reset link' })).not.toBeInTheDocument();
  });

  it('keeps the form and shows the reason when the request fails', async () => {
    const user = userEvent.setup();
    mockResetPassword.mockRejectedValue(new DatabaseError('Too many requests'));
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'player@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/if an account exists for/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeEnabled();
  });

  it('lets the user go back and try a different address', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'typo@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText(/if an account exists for/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Use a different address' }));

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByText(/if an account exists for/i)).not.toBeInTheDocument();
  });
});
