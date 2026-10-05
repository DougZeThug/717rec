import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseAuth, mockNavigate, mockLocation } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockNavigate: vi.fn(),
  mockLocation: { pathname: '/message-board', search: '?tab=new', hash: '#top' },
}));

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

import LoginRequired from '../LoginRequired';

describe('LoginRequired', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a checking message while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true, authInitialized: false });
    render(<LoginRequired>secret</LoginRequired>);

    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('keeps the checking message for a second while auth has not initialised, then asks to sign in', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, authInitialized: false });
    render(<LoginRequired>secret</LoginRequired>);

    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('You must sign in to use this feature.')).toBeInTheDocument();
  });

  it('shows the content to a signed-in user', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, isLoading: false, authInitialized: true });
    render(<LoginRequired>secret</LoginRequired>);

    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('shows a fallback instead of the prompt when one is given', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, authInitialized: true });
    render(<LoginRequired fallback={<p>please join</p>}>secret</LoginRequired>);

    expect(screen.getByText('please join')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('sends a signed-out visitor to sign in and back to the exact address they were on', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, authInitialized: true });
    render(<LoginRequired message="Sign in to post.">secret</LoginRequired>);

    expect(screen.getByText('Sign in to post.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/auth', {
      state: { returnTo: '/message-board?tab=new#top' },
    });
  });
});
