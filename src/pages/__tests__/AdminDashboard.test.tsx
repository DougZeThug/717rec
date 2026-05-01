import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUseAuth = vi.fn();
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mockUseAuth() }));
const mockUseAdminAccess = vi.fn();
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => mockUseAdminAccess() }));
const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({ toast: (...args: unknown[]) => mockToast(...args) }));

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
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },

}));

import React from 'react';

import AdminDashboard from '../AdminDashboard';

describe('AdminDashboard page', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state while auth/admin checks are in progress', () => {
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
    expect(screen.queryByTestId('admin-access-modal')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to /auth with return path state', () => {
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
    expect(mockNavigate).toHaveBeenCalledWith('/auth', { state: { returnTo: '/admin' } });
  });

  it('shows admin access request gate for authenticated non-admin users', () => {
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
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByTestId('admin-access-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-sidebar')).not.toBeInTheDocument();
  });

  it('renders admin dashboard modules for authorized users', () => {
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
    expect(screen.getByTestId('admin-sidebar')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-access-modal')).not.toBeInTheDocument();
  });

  it('calls requestAdminAccess and shows toast after clicking request access', async () => {
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
