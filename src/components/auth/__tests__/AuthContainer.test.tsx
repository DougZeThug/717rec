import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import AuthContainer from '../AuthContainer';

// The real wrapper needs the navigation context; the card is what matters here.
vi.mock('@/components/transitions/PageTransition', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('AuthContainer', () => {
  it('shows the default welcome heading and sign-in hint around the form', () => {
    render(
      <AuthContainer>
        <button type="button">Sign in</button>
      </AuthContainer>
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome to 717Rec' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sign in or create an account to access all features')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('uses a custom title and description and only draws the footer when given one', () => {
    const { rerender } = render(
      <AuthContainer title="Reset password" description="Pick a new password">
        <p>form</p>
      </AuthContainer>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Reset password' })).toBeInTheDocument();
    expect(screen.getByText('Pick a new password')).toBeInTheDocument();
    expect(screen.queryByText('Back to sign in')).not.toBeInTheDocument();

    rerender(
      <AuthContainer
        title="Reset password"
        description="Pick a new password"
        footer="Back to sign in"
      >
        <p>form</p>
      </AuthContainer>
    );
    expect(screen.getByText('Back to sign in')).toBeInTheDocument();
  });
});
