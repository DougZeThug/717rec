import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import AuthForm from '../AuthForm';

type AuthFormProps = React.ComponentProps<typeof AuthForm>;

const renderForm = (type: 'login' | 'signup', onSubmit: AuthFormProps['onSubmit'] = vi.fn()) =>
  render(
    <MemoryRouter>
      <AuthForm
        type={type}
        onSubmit={onSubmit}
        isSubmitting={false}
        emailError={null}
        passwordError={null}
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
    await user.click(screen.getByRole('button', { name: 'Login' }));

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
