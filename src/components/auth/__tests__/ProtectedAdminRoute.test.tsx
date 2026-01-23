import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProtectedAdminRoute from '../ProtectedAdminRoute';

// Mock the auth context
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
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
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => {
      mockNavigate(to);
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

  it('redirects non-admin users to home page', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@test.com' },
      authInitialized: true,
      profile: { is_admin: false },
    });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: false,
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <ProtectedAdminRoute>
          <div>Admin Content</div>
        </ProtectedAdminRoute>
      </MemoryRouter>
    );

    // Wait for the initial check timeout (1 second in the component)
    await waitFor(
      () => {
        expect(screen.getByText('Redirecting to /')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('renders children for admin users', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', email: 'admin@test.com' },
      authInitialized: true,
      profile: { is_admin: true },
    });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: true,
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
});
