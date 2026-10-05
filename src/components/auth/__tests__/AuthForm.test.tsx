import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import AuthForm from '../AuthForm';

type AuthFormProps = React.ComponentProps<typeof AuthForm>;

const renderForm = (
  type: 'login' | 'signup',
  onSubmit: AuthFormProps['onSubmit'] = vi.fn(),
  errors: Partial<Pick<AuthFormProps, 'emailError' | 'passwordError'>> = {}
) =>
  render(
    <MemoryRouter>
      <AuthForm
        type={type}
        onSubmit={onSubmit}
        isSubmitting={false}
        emailError={errors.emailError ?? null}
        passwordError={errors.passwordError ?? null}
        authError={null}
      />
    </MemoryRouter>
  );

// UX audit X-04: there was no way to reset a forgotten password anywhere in the
// product, so a locked-out player had to email the admin.
describe('AuthForm password recovery link', () => {
  it('offers a way out on the login tab', () => {
    renderForm('login');

    const link = screen.getByRole('link', { name: 'Forgot password?' });
    expect(link).toHaveAttribute('href', '/forgot-password');
  });

  it('does not offer it while signing up, where there is nothing to recover', () => {
    renderForm('signup');

    expect(screen.queryByRole('link', { name: 'Forgot password?' })).not.toBeInTheDocument();
  });
});

// SIGNIN-28: a malformed address has to be refused by the app's own message under
// the Email field. The input is type="email", so without noValidate the browser
// cancels the submit first and onSubmit never runs - the Zod check in useAuthForm
// never gets to set emailError, and the reader sees a browser bubble instead.
describe('AuthForm invalid email', () => {
  it('still reaches onSubmit so the app can show its own message', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm('login', onSubmit);

    await user.type(screen.getByLabelText('Email'), 'sam');
    await user.type(screen.getByLabelText('Password'), 'sixchr');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onSubmit).toHaveBeenCalledWith('sam', 'sixchr');
  });

  it('does the same on the sign-up tab', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm('signup', onSubmit);

    await user.type(screen.getByLabelText('Email'), 'sam');
    await user.type(screen.getByLabelText('Password'), 'sixchr');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onSubmit).toHaveBeenCalledWith('sam', 'sixchr');
  });
});

// UX audit (UI/UX 2026-10, item "Auth form has no aria-invalid"): the red border
// and the message under a field are for the eye. A screen reader needs the field
// marked invalid and the message tied to it.
describe('AuthForm field errors for screen readers', () => {
  it('marks the email field invalid and reads its message', () => {
    renderForm('login', vi.fn(), { emailError: 'Please enter a valid email address' });

    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Please enter a valid email address');
    expect(screen.getByLabelText('Password')).not.toHaveAttribute('aria-invalid');
  });

  it('marks the password field invalid and reads its message', () => {
    renderForm('signup', vi.fn(), { passwordError: 'Password must be at least 6 characters' });

    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAccessibleDescription('Password must be at least 6 characters');
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
  });

  it('adds no aria attributes while there is no error', () => {
    renderForm('login');

    for (const field of [screen.getByLabelText('Email'), screen.getByLabelText('Password')]) {
      expect(field).not.toHaveAttribute('aria-invalid');
      expect(field).not.toHaveAttribute('aria-describedby');
    }
  });
});
