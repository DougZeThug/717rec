import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
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
  default: ({ section }: { section: string }) => (
    <div data-testid="admin-sidebar">Admin Sidebar: {section}</div>
  ),
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
  m: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

import React from 'react';

import { ADMIN_TAB_STORAGE_KEY } from '@/utils/adminTabs';

import AdminDashboard from '../AdminDashboard';

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

/**
 * The page is reached at two addresses: a bare `/admin`, which reopens the last
 * section, and `/admin/<section>`, which names one. Both go through the router
 * here so the redirects are real rather than mocked.
 */
const renderDashboard = (path = '/admin/timeslots') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/:section" element={<AdminDashboard />} />
      </Routes>
    </MemoryRouter>
  );

const currentPath = () => screen.getByTestId('location').textContent;

const asAdmin = () => {
  mockUseAuth.mockReturnValue({ user: { id: 'admin-1' }, authInitialized: true });
  mockUseAdminAccess.mockReturnValue({
    isAdminAccessGranted: true,
    requestAdminAccess: vi.fn(),
    isLoading: false,
  });
};

describe('AdminDashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('shows loading state while auth/admin checks are in progress', () => {
    mockUseAuth.mockReturnValue({ user: null, authInitialized: false });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: false,
      requestAdminAccess: vi.fn(),
      isLoading: true,
    });
    renderDashboard();
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
    renderDashboard();
    expect(mockNavigate).toHaveBeenCalledWith('/auth', { state: { returnTo: '/admin' } });
  });

  it('shows admin access request gate for authenticated non-admin users', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, authInitialized: true });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: false,
      requestAdminAccess: vi.fn(),
      isLoading: false,
    });
    renderDashboard();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByTestId('admin-access-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-sidebar')).not.toBeInTheDocument();
  });

  it('renders admin dashboard modules for authorized users', () => {
    asAdmin();
    renderDashboard();
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('admin-sidebar')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-access-modal')).not.toBeInTheDocument();
  });

  it('opens the section named in the address', () => {
    asAdmin();
    renderDashboard('/admin/pending-matches');

    expect(screen.getByTestId('admin-sidebar')).toHaveTextContent('Admin Sidebar: pending-matches');
    expect(currentPath()).toBe('/admin/pending-matches');
  });

  // The user menu links to a bare /admin, so an admin mid-task who clicks it
  // should come back to what they were doing.
  it('sends a bare /admin to the section remembered from last time', () => {
    asAdmin();
    sessionStorage.setItem(ADMIN_TAB_STORAGE_KEY, 'divisions');
    renderDashboard('/admin');

    expect(currentPath()).toBe('/admin/divisions');
  });

  it('sends a bare /admin to Timeslots on a first visit', () => {
    asAdmin();
    renderDashboard('/admin');

    expect(currentPath()).toBe('/admin/timeslots');
  });

  // A typo, or a link from a build where the section was called something else.
  // It lands on the default rather than the remembered section, so a bad link
  // always ends up in the same predictable place.
  it('sends an address that names no section to Timeslots', () => {
    asAdmin();
    sessionStorage.setItem(ADMIN_TAB_STORAGE_KEY, 'divisions');
    renderDashboard('/admin/not-a-section');

    expect(currentPath()).toBe('/admin/timeslots');
  });

  it('ignores a remembered section that no longer exists', () => {
    asAdmin();
    sessionStorage.setItem(ADMIN_TAB_STORAGE_KEY, 'section-from-an-older-build');
    renderDashboard('/admin');

    expect(currentPath()).toBe('/admin/timeslots');
  });

  it('calls requestAdminAccess and shows toast after clicking request access', async () => {
    const requestAdminAccess = vi.fn();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, authInitialized: true });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: false,
      requestAdminAccess,
      isLoading: false,
    });
    renderDashboard();
    await userEvent.click(screen.getByRole('button', { name: 'Request Access' }));
    expect(requestAdminAccess).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Access requested' }));
  });
});
