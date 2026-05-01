import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TeamDetails from '../TeamDetails';

const mockNavigate = vi.fn();
const mockUseResolveTeamSlug = vi.fn();
const mockUseTeamDetails = vi.fn();
const mockUseTeamMatches = vi.fn();
const mockUseTeamRankings = vi.fn();
const mockStickyNav = vi.fn();
const mockTeamHeader = vi.fn();
const mockAdvancedStatsSection = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useResolveTeamSlug', () => ({ useResolveTeamSlug: (...args: unknown[]) => mockUseResolveTeamSlug(...args) }));
vi.mock('@/hooks/useTeamDetails', () => ({ useTeamDetails: (...args: unknown[]) => mockUseTeamDetails(...args) }));
vi.mock('@/hooks/useTeamMatches', () => ({ useTeamMatches: (...args: unknown[]) => mockUseTeamMatches(...args) }));
vi.mock('@/hooks/useTeamRankings', () => ({ useTeamRankings: (...args: unknown[]) => mockUseTeamRankings(...args) }));

vi.mock('@/components/ui/skeleton', () => ({ Skeleton: () => <div>Loading team details...</div> }));
vi.mock('@/components/teams/TeamDetailsStickyNav', () => ({ default: () => (mockStickyNav(), <p>Sticky Nav</p>) }));
vi.mock('@/components/navigation/AnimatedBreadcrumbs', () => ({ default: () => <nav aria-label="breadcrumbs">Team Breadcrumbs</nav> }));
vi.mock('@/components/teams/TeamHeader', () => ({
  default: ({ team }: { team: { name: string } }) => (mockTeamHeader(team), <h1>{team.name}</h1>),
}));
vi.mock('@/components/teams/TeamPerformanceCards', () => ({ default: () => <p>Performance Cards</p> }));
vi.mock('@/components/teams/PlayerList', () => ({ default: () => <p>Roster Section</p> }));
vi.mock('@/components/ui/CollapsibleSection', () => ({ CollapsibleSection: ({ title, children }: { title: string; children: React.ReactNode }) => <section><h2>{title}</h2>{children}</section> }));
vi.mock('@/components/teams/StatBreakdown', () => ({ default: () => <p>Stat Breakdown</p> }));
vi.mock('@/components/teams/TeamAdvancedStatsSection', () => ({ default: ({ teamId }: { teamId: string }) => (mockAdvancedStatsSection(teamId), <p>Advanced Stats</p>) }));
vi.mock('@/components/teams/TeamReportCard', () => ({ default: () => <p>Report Card</p> }));
vi.mock('@/components/teams/RivalryHighlights', () => ({ default: () => <p>Rivalries</p> }));
vi.mock('@/components/stats/HeadToHeadRecords', () => ({ default: () => <p>Head to Head</p> }));
vi.mock('@/components/teams/MatchList', () => ({ default: ({ matches }: { matches: unknown[] }) => (matches.length === 0 ? <p>No Match History</p> : <p>Match History Loaded</p>) }));
vi.mock('@/components/teams/TeamTotals', () => ({ default: () => <p>Career Totals</p> }));
vi.mock('@/components/teams/TeamCareerPowerScoreChart', () => ({ default: () => <p>Power Score Chart</p> }));
vi.mock('@/components/badges/TeamBadgeCollection', () => ({ default: () => <p>Team Badges</p> }));

const createTestQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const renderPage = (initialEntry = '/teams/falcons') => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/teams/:teamId" element={<TeamDetails />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('TeamDetails page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseResolveTeamSlug.mockReturnValue({ teamId: 't-1', isResolving: false });
    mockUseTeamDetails.mockReturnValue({ team: { id: 't-1', name: 'Falcons', wins: 4, losses: 2, players: [], power_score: 82, sos: 0.6, game_wins: 10, game_losses: 5, close_match_losses: 1, win_percentage: 0.67, game_win_percentage: 0.67 }, isLoading: false });
    mockUseTeamMatches.mockReturnValue({ pastMatches: [{ id: 'm1' }], isLoadingMatches: false });
    mockUseTeamRankings.mockReturnValue({ rankings: [{ teamId: 't-1', rankChange: 1 }] });
  });

  it('passes route param into slug resolver and renders success module wiring', () => {
    renderPage('/teams/falcons');
    expect(mockUseResolveTeamSlug).toHaveBeenCalledWith('falcons');
    expect(screen.getByText('Sticky Nav')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Falcons' })).toBeInTheDocument();
    expect(screen.getByText('Performance Cards')).toBeInTheDocument();
    expect(screen.getByText('Match History Loaded')).toBeInTheDocument();
    expect(mockTeamHeader).toHaveBeenCalled();
    expect(mockAdvancedStatsSection).toHaveBeenCalledWith('t-1');
  });

  it('shows loading UI and hides success modules while data is loading', () => {
    mockUseTeamDetails.mockReturnValue({ team: null, isLoading: true });
    renderPage();
    expect(screen.getAllByText('Loading team details...').length).toBeGreaterThan(0);
    expect(screen.queryByText('Performance Cards')).not.toBeInTheDocument();
  });

  it('shows not-found fallback message and action when resolved team does not exist', () => {
    mockUseTeamDetails.mockReturnValue({ team: null, isLoading: false });
    renderPage();
    expect(screen.getByText('Team Not Found')).toBeInTheDocument();
    expect(screen.getByText("The team you're looking for doesn't exist.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Teams' })).toBeInTheDocument();
  });

  it('shows match-history empty surface when there are no past matches', () => {
    mockUseTeamMatches.mockReturnValue({ pastMatches: [], isLoadingMatches: false });
    renderPage();
    expect(screen.getByText('No Match History')).toBeInTheDocument();
  });

  it('navigates back when Back is pressed', () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: /back/i })[0]);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
