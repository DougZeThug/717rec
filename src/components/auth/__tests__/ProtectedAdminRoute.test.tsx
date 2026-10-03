import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toast } from '@/hooks/useToast';

import ProtectedAdminRoute from '../ProtectedAdminRoute';

// Mock the auth context
const mockUseAuth = vi.fn();
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the admin access hook
const mockUseAdminAccess = vi.fn();
vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => mockUseAdminAccess(),
}));

// Mock toast
vi.mock('@/hooks/useToast', () => ({
  toast: vi.fn(),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  authLog: vi.fn(),
}));

// Mock Navigate component to track redirects
const mockNavigate = vi.fn();
const mockNavigateState = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    Navigate: ({ to, state }: { to: string; state?: unknown }) => {
      mockNavigate(to);
      mockNavigateState(state);
      return <div data-testid="navigate">{`Redirecting to ${to}`}</div>;
    },
  };
});

describe('ProtectedAdminRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when auth is not initialized', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      authInitialized: false,
      profile: null,
    });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: false,
      accessCheckFailed: false,
      retryAccessCheck: vi.fn(),
      isLoading: true,
    });

    render(
      <MemoryRouter>
        <ProtectedAdminRoute>
          <div>Admin Content</div>
        </ProtectedAdminRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Checking access...')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to /auth', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      authInitialized: true,
      profile: null,
    });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: false,
      accessCheckFailed: false,
      retryAccessCheck: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <ProtectedAdminRoute>
          <div>Admin Content</div>
        </ProtectedAdminRoute>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByText('Redirecting to /auth')).toBeInTheDocument();
    });
  });

  it('keeps a non-admin on a page that explains why, with no toast and no redirect', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@test.com' },
      authInitialized: true,
      profile: { is_admin: false },
    });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: false,
      accessCheckFailed: false,
      retryAccessCheck: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <ProtectedAdminRoute>
          <div data-testid="admin-content">Admin Content</div>
        </ProtectedAdminRoute>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Admins only' })).toBeInTheDocument();
    expect(screen.getByText(/user@test\.com/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Contact the league' })).toHaveAttribute(
      'href',
      '/contact'
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(vi.mocked(toast)).not.toHaveBeenCalled();
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('sends a signed-out visitor to sign in, remembering the whole address', async () => {
    mockUseAuth.mockReturnValue({ user: null, authInitialized: true, profile: null });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: false,
      accessCheckFailed: false,
      retryAccessCheck: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/admin/scores?week=3#row-9']}>
        <ProtectedAdminRoute>
          <div>Admin Content</div>
        </ProtectedAdminRoute>
      </MemoryRouter>
    );

    expect(await screen.findByText('Redirecting to /auth')).toBeInTheDocument();
    expect(mockNavigateState).toHaveBeenCalledWith({ returnTo: '/admin/scores?week=3#row-9' });
  });

  it('renders children for admin users', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', email: 'admin@test.com' },
      authInitialized: true,
      profile: { is_admin: true },
    });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: true,
      accessCheckFailed: false,
      retryAccessCheck: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <ProtectedAdminRoute>
          <div data-testid="admin-content">Admin Content</div>
        </ProtectedAdminRoute>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-content')).toBeInTheDocument();
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
  });

  it('shows a retry card instead of redirecting when the profile failed to load', async () => {
    const retryAccessCheck = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', email: 'admin@test.com' },
      authInitialized: true,
      profile: null,
    });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: false,
      accessCheckFailed: true,
      retryAccessCheck,
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <ProtectedAdminRoute>
          <div data-testid="admin-content">Admin Content</div>
        </ProtectedAdminRoute>
      </MemoryRouter>
    );

    expect(await screen.findByText(/could not load your profile/i)).toBeInTheDocument();
    // The admin stays put: no redirect, and no false "Access Denied" toast.
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(vi.mocked(toast)).not.toHaveBeenCalled();
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(retryAccessCheck).toHaveBeenCalledTimes(1);
  });
});
