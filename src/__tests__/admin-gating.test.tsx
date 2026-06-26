import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '@/App';

const mockUseAuth = vi.fn();
const mockUseAdminAccess = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => mockUseAdminAccess(),
}));

vi.mock('@/hooks/useToast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toasts: [] }),
}));

vi.mock('@/utils/analytics', () => ({
  initAnalytics: vi.fn(),
  trackPageView: vi.fn(),
}));

vi.mock('@/utils/routePrefetch', () => ({
  preloadCoreRoutes: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  authLog: vi.fn(),
  errorLog: vi.fn(),
  routeLog: vi.fn(),
}));

vi.mock('@/utils/sentry', () => ({
  metrics: {
    count: vi.fn(),
    distribution: vi.fn(),
  },
}));

vi.mock('@/components/layout/Navbar', () => ({
  default: () => <nav aria-label="Main navigation">Navigation</nav>,
}));

vi.mock('@/components/navigation/AppNavigation', () => ({
  default: () => <nav aria-label="App navigation">App Navigation</nav>,
}));

vi.mock('@/components/layout/Footer', () => ({
  default: () => <footer>Footer</footer>,
}));

vi.mock('@/components/transitions/PageTransition', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/pages/Index', () => ({
  default: () => <h1>Home Page</h1>,
}));

vi.mock('@/pages/AdminDashboard', () => ({
  default: () => <h1>Admin Dashboard</h1>,
}));

describe('admin route gating', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/admin');
  });

  it('redirects an authenticated non-admin away from /admin without rendering the dashboard', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'player@example.com' },
      authInitialized: true,
      profile: { id: 'profile-1', is_admin: false },
      isProfileLoading: false,
    });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: false,
      isLoading: false,
      requestAdminAccess: vi.fn(),
      checkAdminAccess: vi.fn(),
      revokeAdminAccess: vi.fn(),
    });

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(await screen.findByRole('heading', { name: /home page/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /admin dashboard/i })).not.toBeInTheDocument();
  });

  it('renders the /admin dashboard for an authenticated admin', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', email: 'admin@example.com' },
      authInitialized: true,
      profile: { id: 'profile-admin-1', is_admin: true },
      isProfileLoading: false,
    });
    mockUseAdminAccess.mockReturnValue({
      isAdminAccessGranted: true,
      isLoading: false,
      requestAdminAccess: vi.fn(),
      checkAdminAccess: vi.fn(),
      revokeAdminAccess: vi.fn(),
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin');
    expect(screen.queryByRole('heading', { name: /home page/i })).not.toBeInTheDocument();
  });
});
