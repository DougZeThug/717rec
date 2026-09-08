import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import AuthForm from '../AuthForm';

const renderForm = (type: 'login' | 'signup') =>
  render(
    <MemoryRouter>
      <AuthForm
        type={type}
        onSubmit={vi.fn()}
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
