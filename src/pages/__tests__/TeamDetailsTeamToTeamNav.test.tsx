import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TeamDetails from '../TeamDetails';

// Unlike TeamDetails.test.tsx this file leaves react-router alone: the whole
// point is to move between two team pages through a real in-app link.
const mockUseResolveTeamSlug = vi.fn();
const mockUseTeamDetails = vi.fn();
const mockUseTeamMatches = vi.fn();
const mockUseTeamRankings = vi.fn();

vi.mock('@/hooks/useResolveTeamSlug', () => ({
  useResolveTeamSlug: (...args: unknown[]) => mockUseResolveTeamSlug(...args),
}));
vi.mock('@/hooks/useTeamDetails', () => ({
  useTeamDetails: (...args: unknown[]) => mockUseTeamDetails(...args),
}));
vi.mock('@/hooks/useTeamMatches', () => ({
  useTeamMatches: (...args: unknown[]) => mockUseTeamMatches(...args),
}));
vi.mock('@/hooks/useTeamRankings', () => ({
  useTeamRankings: (...args: unknown[]) => mockUseTeamRankings(...args),
}));

vi.mock('@/components/ui/skeleton', () => ({ Skeleton: () => <div>Loading team details...</div> }));
vi.mock('@/components/teams/TeamDetailsStickyNav', () => ({ default: () => <p>Sticky Nav</p> }));
vi.mock('@/components/navigation/AnimatedBreadcrumbs', () => ({
  default: () => <nav aria-label="breadcrumbs">Team Breadcrumbs</nav>,
}));
vi.mock('@/components/teams/TeamHeader', () => ({
  default: ({ team }: { team: { name: string } }) => <h1>{team.name}</h1>,
}));
vi.mock('@/components/teams/TeamPerformanceCards', () => ({
  default: () => <p>Performance Cards</p>,
}));
vi.mock('@/components/teams/PlayerList', () => ({ default: () => <p>Roster Section</p> }));
// Exposing defaultOpen as an attribute is how TeamDetails.test.tsx reads a
// section's open state, and it is what a linked section drives.
vi.mock('@/components/ui/CollapsibleSection', () => ({
  CollapsibleSection: ({
    title,
    children,
    defaultOpen,
  }: {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
  }) => (
    <section aria-label={title} data-open={defaultOpen ? 'true' : 'false'}>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));
vi.mock('@/components/teams/StatBreakdown', () => ({ default: () => <p>Stat Breakdown</p> }));
vi.mock('@/components/teams/TeamAdvancedStatsSection', () => ({
  default: () => <p>Advanced Stats</p>,
}));
vi.mock('@/components/teams/TeamReportCard', () => ({ default: () => <p>Report Card</p> }));
vi.mock('@/components/teams/RivalryHighlights', () => ({ default: () => <p>Rivalries</p> }));
vi.mock('@/components/stats/HeadToHeadRecords', () => ({ default: () => <p>Head to Head</p> }));
vi.mock('@/components/teams/MatchList', () => ({
  default: () => <p data-testid="match-history">Match History Loaded</p>,
}));
vi.mock('@/components/teams/TeamTotals', () => ({ default: () => <p>Career Totals</p> }));
vi.mock('@/components/teams/TeamCareerPowerScoreChart', () => ({
  default: () => <p>Power Score Chart</p>,
}));
vi.mock('@/components/badges/TeamBadgeCollection', () => ({ default: () => <p>Team Badges</p> }));

const team = (id: string, name: string) => ({
  id,
  name,
  wins: 4,
  losses: 2,
  players: [],
  power_score: 82,
  sos: 0.6,
  game_wins: 10,
  game_losses: 5,
  close_match_losses: 1,
  win_percentage: 0.67,
  game_win_percentage: 0.67,
});

const careerSection = () => screen.getByRole('region', { name: 'Career & Achievements' });

const renderAtCareerDeepLink = () =>
  render(
    <HelmetProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/teams/falcons#career']}>
          {/* Stands in for the opponent links the page itself renders. */}
          <Link to="/teams/eagles">Go to Eagles</Link>
          <Routes>
            <Route path="/teams/:teamId" element={<TeamDetails />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );

describe('TeamDetails team-to-team in-app navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseResolveTeamSlug.mockImplementation((param: string) =>
      param === 'eagles'
        ? { teamId: 't-2', isResolving: false }
        : { teamId: 't-1', isResolving: false }
    );
    mockUseTeamDetails.mockImplementation((teamId: string) => ({
      team: teamId === 't-2' ? team('t-2', 'Eagles') : team('t-1', 'Falcons'),
      isLoading: false,
    }));
    mockUseTeamMatches.mockReturnValue({ pastMatches: [{ id: 'm1' }], isLoadingMatches: false });
    mockUseTeamRankings.mockReturnValue({ rankings: [{ teamId: 't-1', rankChange: 1 }] });
  });

  it('does not keep a deep-linked section open after navigating to a different team in-app', async () => {
    const user = userEvent.setup();
    renderAtCareerDeepLink();

    // The link named #career, so the section opens for Falcons.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Falcons');
    expect(careerSection()).toHaveAttribute('data-open', 'true');

    await user.click(screen.getByRole('link', { name: 'Go to Eagles' }));

    // /teams/eagles names no section, so Eagles arrives with Career closed
    // rather than inheriting what the reader left open on Falcons.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Eagles');
    expect(careerSection()).toHaveAttribute('data-open', 'false');
  });
});
