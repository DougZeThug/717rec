import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Help from '../Help';

const mockUseAdminAccess = vi.fn();
const mockHelpState = vi.fn();

vi.mock('react-helmet-async', () => ({ Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => mockUseAdminAccess() }));
vi.mock('@/components/help/HelpQuickLinks', () => ({ HelpQuickLinks: () => <p>Quick Links</p> }));
vi.mock('@/components/help/HelpAdminCTA', () => ({ HelpAdminCTA: () => <p>Admin CTA</p> }));
vi.mock('@/components/help/sections/WelcomeSection', () => ({ WelcomeSection: () => <p>Welcome Section</p> }));
vi.mock('@/components/help/sections/StandingsSection', () => ({ StandingsSection: () => <p>Standings Section</p> }));
vi.mock('@/components/help/sections/ScheduleSection', () => ({ ScheduleSection: () => <p>Schedule Section</p> }));
vi.mock('@/components/help/sections/TeamsSection', () => ({ TeamsSection: () => <p>Teams Section</p> }));
vi.mock('@/components/help/sections/PlayoffsSection', () => ({ PlayoffsSection: () => <p>Playoffs Section</p> }));
vi.mock('@/components/help/sections/MessageBoardSection', () => ({ MessageBoardSection: () => <p>Message Board Section</p> }));
vi.mock('@/components/help/sections/HistorySection', () => ({ HistorySection: () => <p>History Section</p> }));
vi.mock('@/components/help/sections/AccessibilitySection', () => ({ AccessibilitySection: () => <p>Accessibility Section</p> }));
vi.mock('@/components/help/sections/FAQSection', () => ({ FAQSection: () => <p>FAQ Section</p> }));
vi.mock('@/components/help/sections/admin/AdminSections', () => ({
  AdminSections: () => {
    const state = mockHelpState();
    if (state.isLoading) return <p>Loading admin help...</p>;
    return <p>Admin Help</p>;
  },
}));
vi.mock('@/components/ui/accordion', () => ({ Accordion: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const renderPage = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Help />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Help page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: true });
    mockHelpState.mockReturnValue({ isLoading: false });
  });

  it('shows loading state for admin help block', () => {
    mockHelpState.mockReturnValue({ isLoading: true });
    renderPage();
    expect(screen.getByText('Loading admin help...')).toBeInTheDocument();
  });

  it('shows happy path render', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Help & Getting Started' })).toBeInTheDocument();
    expect(screen.getByText('Admin Help')).toBeInTheDocument();
  });

  it('shows non-admin empty/error branch without admin sections', () => {
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false });
    renderPage();
    expect(screen.queryByText('Admin Help')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin CTA')).not.toBeInTheDocument();
  });
});
