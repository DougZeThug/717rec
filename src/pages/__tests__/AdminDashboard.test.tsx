import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseAdminAccess = vi.fn();
vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => mockUseAdminAccess(),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

// Lightweight stubs
vi.mock('@/components/admin/dashboard/AdminSidebar', () => ({
  default: () => <div data-testid="admin-sidebar">Admin Sidebar</div>,
}));

vi.mock('@/components/admin/AdminAccessModal', () => ({
  AdminAccessModal: ({
    isOpen,
    onRequestAccess,
  }: {
    isOpen: boolean;
    onRequestAccess: () => void;
  }) =>
    isOpen ? (
      <div data-testid="admin-access-modal">
        <button onClick={onRequestAccess}>Request Access</button>
      </div>
    ) : null,
}));

// framer-motion: just render children
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

// Import after mocks
import React from 'react';

import AdminDashboard from '../AdminDashboard';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdminDashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when auth is not yet initialized', () => {
    mockUseAuth.mockReturnValue({ user: null, authInitialized: false });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: false,
      requestAdminAccess: vi.fn(),
      isLoading: true,
    });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('Checking access...')).toBeInTheDocument();
  });

  it('shows loading spinner when admin access check is in progress', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, authInitialized: true });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: false,
      requestAdminAccess: vi.fn(),
      isLoading: true,
    });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('Checking access...')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to /auth', () => {
    mockUseAuth.mockReturnValue({ user: null, authInitialized: true });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: false,
      requestAdminAccess: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/auth', {
      state: { returnTo: '/admin' },
    });
  });

  it('does not redirect when user is logged in', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, authInitialized: true });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: true,
      requestAdminAccess: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows AdminAccessModal when user is logged in but not admin', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, authInitialized: true });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: false,
      requestAdminAccess: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    expect(screen.getByTestId('admin-access-modal')).toBeInTheDocument();
  });

  it('renders AdminSidebar for admin users', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'admin-1' }, authInitialized: true });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: true,
      requestAdminAccess: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    expect(screen.getByTestId('admin-sidebar')).toBeInTheDocument();
  });

  it('shows Admin Dashboard heading for admin users', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'admin-1' }, authInitialized: true });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: true,
      requestAdminAccess: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('calls requestAdminAccess and shows toast when Request Access is clicked', async () => {
    const requestAdminAccess = vi.fn();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, authInitialized: true });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: false,
      requestAdminAccess,
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Request Access' }));

    expect(requestAdminAccess).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Access requested' }));
  });
});
