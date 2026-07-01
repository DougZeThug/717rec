import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/contexts/auth-context';
import { useTeamMembership } from '@/hooks/useTeamMembership';
import ProfileSetup from '@/pages/ProfileSetup';
import { checkUsernameAvailability, updateProfile } from '@/services/profile/ProfileService';

const mockNavigate = vi.fn();

vi.mock('@/contexts/auth-context', () => ({ useAuth: vi.fn() }));

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => mockNavigate,
}));

// Keep the real profileSchema so the real ProfileForm validates as in production.
vi.mock('@/services/profile/ProfileService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/profile/ProfileService')>()),
  checkUsernameAvailability: vi.fn().mockResolvedValue({ available: true }),
  updateProfile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/hooks/useTeamMembership', () => ({ useTeamMembership: vi.fn() }));

vi.mock('@/hooks/useToast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/utils/logger', () => ({ authLog: vi.fn(), errorLog: vi.fn() }));

vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/transitions/PageTransition', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProfileSetup />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const defaultTeamMembership = () => ({
  membership: null,
  availableTeams: [],
  isLoading: false,
  isFetching: false,
  joinTeam: vi.fn(),
  leaveTeam: vi.fn(),
  refreshMembership: vi.fn(),
});

const authenticatedAuth = () => ({
  user: { id: 'u1' },
  profile: { username: 'Bob', full_name: 'Bob Smith' },
  refreshProfile: vi.fn().mockResolvedValue(undefined),
  isLoading: false,
  authInitialized: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.mocked(useTeamMembership).mockReturnValue(defaultTeamMembership() as never);
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('ProfileSetup', () => {
  it('shows loading state while auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      refreshProfile: vi.fn(),
      isLoading: true,
      authInitialized: true,
    } as never);

    renderPage();

    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
  });

  it('shows loading state while auth is not yet initialized', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      refreshProfile: vi.fn(),
      isLoading: false,
      authInitialized: false,
    } as never);

    renderPage();

    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
  });

  it('redirects to /auth after max retries when there is no user', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      refreshProfile: vi.fn(),
      isLoading: false,
      authInitialized: true,
    } as never);

    renderPage();

    // Three retries at 1s each, then it redirects.
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      '/auth',
      expect.objectContaining({ state: { returnTo: '/setup-profile' } })
    );
  });

  it('renders the real ProfileForm and TeamMembershipSection when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue(authenticatedAuth() as never);

    renderPage();

    expect(screen.getByText('Set Up Your Profile')).toBeInTheDocument();
    // Real ProfileForm children
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Profile' })).toBeInTheDocument();
    // Real TeamMembershipSection
    expect(screen.getByText('Team Membership')).toBeInTheDocument();
  });

  describe('TeamMembershipSection states', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue(authenticatedAuth() as never);
    });

    it('shows only a spinner (no heading) while fetching but keeps ProfileForm', () => {
      vi.mocked(useTeamMembership).mockReturnValue({
        ...defaultTeamMembership(),
        isFetching: true,
      } as never);

      renderPage();

      expect(screen.queryByText('Team Membership')).toBeNull();
      // ProfileForm is still rendered
      expect(screen.getByRole('button', { name: 'Save Profile' })).toBeInTheDocument();
    });

    it('shows approved membership with team name and Approved badge', () => {
      vi.mocked(useTeamMembership).mockReturnValue({
        ...defaultTeamMembership(),
        membership: {
          is_approved: true,
          approved_at: '2026-01-01',
          joined_at: '2026-01-01',
          team_id: 't1',
          team: { name: 'Aces' },
        },
      } as never);

      renderPage();

      expect(screen.getByText('Aces')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('shows the join button when teams are available and there is no membership', () => {
      vi.mocked(useTeamMembership).mockReturnValue({
        ...defaultTeamMembership(),
        membership: null,
        availableTeams: [{ id: 't1', name: 'Aces', logoUrl: null }],
      } as never);

      renderPage();

      expect(screen.getByRole('button', { name: 'Request to Join Team' })).toBeInTheDocument();
    });

    it('shows the empty state when no teams are available', () => {
      vi.mocked(useTeamMembership).mockReturnValue({
        ...defaultTeamMembership(),
        membership: null,
        availableTeams: [],
      } as never);

      renderPage();

      expect(screen.getByText('No Teams Available')).toBeInTheDocument();
    });
  });

  it('submits the profile, refreshes, and navigates home', async () => {
    const auth = authenticatedAuth();
    // Start with a blank username so the submit button begins disabled.
    auth.profile = { username: '', full_name: '' };
    vi.mocked(useAuth).mockReturnValue(auth as never);

    renderPage();

    const firstName = screen.getByPlaceholderText('Enter your first name');
    await act(async () => {
      fireEvent.change(firstName, { target: { value: 'Doug' } });
    });

    // Let the debounced username availability check fire and its promise resolve.
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(checkUsernameAvailability).toHaveBeenCalled();

    const saveButton = screen.getByRole('button', { name: 'Save Profile' });
    expect(saveButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(saveButton);
    });

    // Flush the submit promise chain (updateProfile -> onProfileUpdated).
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(updateProfile).toHaveBeenCalledWith('u1', expect.objectContaining({ username: 'Doug' }));
    expect(auth.refreshProfile).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
