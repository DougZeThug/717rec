import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.hoisted(() => vi.fn());

// LoginPrompt imports useNavigate from 'react-router' (not 'react-router-dom'),
// so we mock that exact module path.
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

import LoginPrompt from '@/components/message-board/LoginPrompt';

describe('LoginPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the sign-in prompt and button', () => {
    render(<LoginPrompt />);
    expect(screen.getByText('Sign in to post messages')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('navigates to /auth with the message-board returnTo state when Sign In is clicked', () => {
    render(<LoginPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/auth', {
      state: { returnTo: '/message-board' },
    });
  });
});
