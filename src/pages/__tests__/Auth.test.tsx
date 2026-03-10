import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null, pathname: '/auth', search: '', hash: '' }),
  };
});

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseAuthForm = vi.fn();
vi.mock('@/hooks/useAuthForm', () => ({
  useAuthForm: () => mockUseAuthForm(),
}));

vi.mock('@/hooks/useNativePlatform', () => ({
  useNativePlatform: () => ({ isNative: false }),
}));

vi.mock('@/utils/logger', () => ({
  authLog: vi.fn(),
  teamLog: vi.fn(),
  matchLog: vi.fn(),
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  scoreLog: vi.fn(),
  dbLog: vi.fn(),
}));

vi.mock('@/utils/auth/sanitizeReturnTo', () => ({
  sanitizeReturnTo: (path: string | undefined) => path ?? '/',
}));

// Lightweight stubs for heavy components
vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

vi.mock('@/components/auth/AuthContainer', () => ({
  default: ({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) => (
    <div data-testid="auth-container">
      {children}
      {footer}
    </div>
  ),
}));

vi.mock('@/components/auth/SocialAuthButtons', () => ({
  default: () => <div data-testid="social-auth-buttons" />,
}));

vi.mock('@/components/auth/AuthForm', () => ({
  default: ({ type, onSubmit }: { type: string; onSubmit: (e: React.FormEvent) => void }) => (
    <form data-testid={`auth-form-${type}`} onSubmit={onSubmit}>
      <button type="submit">Submit {type}</button>
    </form>
  ),
}));

// Import after mocks
import React from 'react';

import Auth from '../Auth';

// ─── Default mock values ──────────────────────────────────────────────────────

const defaultAuthFormValues = {
  activeTab: 'login' as const,
  setActiveTab: vi.fn(),
  isSubmitting: false,
  emailError: '',
  passwordError: '',
  authError: '',
  handleSignIn: vi.fn(),
  handleSignUp: vi.fn(),
  handleGoogleSignIn: vi.fn(),
  handleNativeGoogleSignIn: vi.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Auth page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, authInitialized: true });
    mockUseAuthForm.mockReturnValue({ ...defaultAuthFormValues });
  });

  it('renders the auth container', () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    expect(screen.getByTestId('auth-container')).toBeInTheDocument();
  });

  it('shows Login and Sign Up tab triggers', () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('shows the login form when activeTab is login', () => {
    mockUseAuthForm.mockReturnValue({ ...defaultAuthFormValues, activeTab: 'login' });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    expect(screen.getByTestId('auth-form-login')).toBeInTheDocument();
  });

  it('shows the signup form when activeTab is signup', () => {
    mockUseAuthForm.mockReturnValue({ ...defaultAuthFormValues, activeTab: 'signup' });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    expect(screen.getByTestId('auth-form-signup')).toBeInTheDocument();
  });

  it('renders social auth buttons', () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    expect(screen.getByTestId('social-auth-buttons')).toBeInTheDocument();
  });

  it('redirects to / when user is already authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, authInitialized: true });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('does not redirect when auth is not yet initialized', () => {
    mockUseAuth.mockReturnValue({ user: null, authInitialized: false });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not redirect when user is not logged in', () => {
    mockUseAuth.mockReturnValue({ user: null, authInitialized: true });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows footer link to switch from login to signup', () => {
    mockUseAuthForm.mockReturnValue({ ...defaultAuthFormValues, activeTab: 'login' });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
  });

  it('shows footer link to switch from signup to login', () => {
    mockUseAuthForm.mockReturnValue({ ...defaultAuthFormValues, activeTab: 'signup' });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('calls setActiveTab when footer Sign up button is clicked', () => {
    const setActiveTab = vi.fn();
    mockUseAuthForm.mockReturnValue({
      ...defaultAuthFormValues,
      activeTab: 'login',
      setActiveTab,
    });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(setActiveTab).toHaveBeenCalledWith('signup');
  });

  it('calls setActiveTab when footer Login button is clicked', () => {
    const setActiveTab = vi.fn();
    mockUseAuthForm.mockReturnValue({
      ...defaultAuthFormValues,
      activeTab: 'signup',
      setActiveTab,
    });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(setActiveTab).toHaveBeenCalledWith('login');
  });
});
