import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '@/types/errors';

import TeamDetails from '../TeamDetails';

const mockNavigate = vi.fn();
const mockUseResolveTeamSlug = vi.fn();
const mockUseTeamDetails = vi.fn();
const mockUseTeamMatches = vi.fn();
const mockUseTeamRankings = vi.fn();
const mockUseTeamsQuery = vi.fn();
const mockStickyNav = vi.fn();
const mockTeamHeader = vi.fn();
const mockAdvancedStatsSection = vi.fn();
const mockSeoHead = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
vi.mock('@/hooks/teams', () => ({
  useTeamsQuery: (...args: unknown[]) => mockUseTeamsQuery(...args),
}));

// SeoHead side-effects into document.head and renders nothing into the body,
// so a recorder that returns null is behaviourally identical here and lets the
// canonical address be asserted without waiting on Helmet's flush.
vi.mock('@/components/seo/SeoHead', () => ({
  default: (props: Record<string, unknown>) => {
    mockSeoHead(props);
    return null;
  },
}));
vi.mock('@/components/ui/skeleton', () => ({ Skeleton: () => <div>Loading team details...</div> }));
vi.mock('@/components/teams/TeamDetailsStickyNav', () => ({
  default: () => {
    mockStickyNav();
    return <p>Sticky Nav</p>;
  },
}));
vi.mock('@/components/navigation/AnimatedBreadcrumbs', () => ({
  default: () => <nav aria-label="breadcrumbs">Team Breadcrumbs</nav>,
}));
vi.mock('@/components/teams/TeamHeader', () => ({
  default: ({ team }: { team: { name: string } }) => {
    mockTeamHeader(team);
    return <h1>{team.name}</h1>;
  },
}));
vi.mock('@/components/teams/TeamPerformanceCards', () => ({
  default: () => <p>Performance Cards</p>,
}));
vi.mock('@/components/teams/PlayerList', () => ({ default: () => <p>Roster Section</p> }));
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
    <section data-open={defaultOpen ? 'true' : 'false'}>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));
vi.mock('@/components/teams/StatBreakdown', () => ({ default: () => <p>Stat Breakdown</p> }));
vi.mock('@/components/teams/TeamAdvancedStatsSection', () => ({
  default: ({ teamId }: { teamId: string }) => {
    mockAdvancedStatsSection(teamId);
    return <p>Advanced Stats</p>;
  },
}));
vi.mock('@/components/teams/TeamReportCard', () => ({ default: () => <p>Report Card</p> }));
vi.mock('@/components/teams/RivalryHighlights', () => ({ default: () => <p>Rivalries</p> }));
vi.mock('@/components/stats/HeadToHeadRecords', () => ({ default: () => <p>Head to Head</p> }));
vi.mock('@/components/teams/MatchList', () => ({
  default: ({ matches, defaultOpen }: { matches: unknown[]; defaultOpen?: boolean }) => (
    <p data-testid="match-history" data-open={defaultOpen ? 'true' : 'false'}>
      {matches.length === 0 ? 'No Match History' : 'Match History Loaded'}
    </p>
  ),
}));
vi.mock('@/components/teams/TeamTotals', () => ({ default: () => <p>Career Totals</p> }));
vi.mock('@/components/teams/TeamCareerPowerScoreChart', () => ({
  default: () => <p>Power Score Chart</p>,
}));
vi.mock('@/components/badges/TeamBadgeCollection', () => ({ default: () => <p>Team Badges</p> }));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const renderPage = (
  initialEntry: string | { pathname: string; state?: unknown } = '/teams/falcons'
) => {
  const queryClient = createTestQueryClient();
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/teams/:teamId" element={<TeamDetails />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

describe('TeamDetails page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseResolveTeamSlug.mockReturnValue({ teamId: 't-1', isResolving: false });
    mockUseTeamDetails.mockReturnValue({
      team: {
        id: 't-1',
        name: 'Falcons',
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
      },
      isLoading: false,
    });
    mockUseTeamMatches.mockReturnValue({
      pastMatches: [{ id: 'm1' }],
      upcomingMatches: [],
      isLoadingMatches: false,
    });
    mockUseTeamRankings.mockReturnValue({ rankings: [{ teamId: 't-1', rankChange: 1 }] });
    // The canonical address is only the readable one when that address leads
    // back to this team, so the list has to hold it.
    mockUseTeamsQuery.mockReturnValue({ data: [{ id: 't-1', name: 'Falcons' }] });
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

  it('says the team could not be loaded, with a retry, when the fetch fails', () => {
    const refetchTeam = vi.fn();
    mockUseTeamDetails.mockReturnValue({
      team: undefined,
      isLoading: false,
      error: new Error('network down'),
      refetch: refetchTeam,
    });
    renderPage();

    // A dropped connection is not a missing team.
    expect(screen.queryByText('Team Not Found')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetchTeam).toHaveBeenCalledTimes(1);
  });

  it('treats NotFoundError as a missing team, not a retryable load failure', () => {
    mockUseResolveTeamSlug.mockReturnValue({
      teamId: '11111111-2222-3333-4444-555555555555',
      isResolving: false,
    });
    mockUseTeamDetails.mockReturnValue({
      team: undefined,
      isLoading: false,
      error: new NotFoundError('Team'),
      refetch: vi.fn(),
    });
    renderPage('/teams/11111111-2222-3333-4444-555555555555');

    expect(screen.getByText('Team Not Found')).toBeInTheDocument();
    expect(screen.getByText("The team you're looking for doesn't exist.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('says the team could not be loaded, with a retry, when the teams list fails on a readable-name address', () => {
    const refetchTeams = vi.fn();
    mockUseResolveTeamSlug.mockReturnValue({ teamId: undefined, isResolving: false });
    mockUseTeamDetails.mockReturnValue({
      team: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseTeamsQuery.mockReturnValue({
      data: undefined,
      error: new Error('network down'),
      refetch: refetchTeams,
    });
    renderPage('/teams/falcons');

    // The list never loaded, so we cannot say the team does not exist.
    expect(screen.queryByText('Team Not Found')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetchTeams).toHaveBeenCalledTimes(1);
  });

  it('still says not found when the teams list loaded and holds no match for the name', () => {
    mockUseResolveTeamSlug.mockReturnValue({ teamId: undefined, isResolving: false });
    mockUseTeamDetails.mockReturnValue({
      team: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    // A background refresh failed, but the list we hold answers the question.
    mockUseTeamsQuery.mockReturnValue({
      data: [{ id: 't-9', name: 'Eagles' }],
      error: new Error('refresh failed'),
      refetch: vi.fn(),
    });
    renderPage('/teams/falcons');

    expect(screen.getByText('Team Not Found')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('still lets the visitor go back to the teams list when the fetch fails', () => {
    mockUseTeamDetails.mockReturnValue({
      team: undefined,
      isLoading: false,
      error: new Error('network down'),
      refetch: vi.fn(),
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Teams' }));

    expect(mockNavigate).toHaveBeenCalledWith('/teams');
  });

  it('offers a retry when only the match data failed, instead of reading as no matches', () => {
    const refetchMatches = vi.fn();
    mockUseTeamMatches.mockReturnValue({
      pastMatches: [],
      upcomingMatches: [],
      isLoadingMatches: false,
      matchesError: new Error('boom'),
      refetchMatches,
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetchMatches).toHaveBeenCalledTimes(1);
  });

  it('shows the next match, linked to the schedule night, for anyone', () => {
    mockUseTeamMatches.mockReturnValue({
      pastMatches: [],
      upcomingMatches: [
        {
          id: 'm-next',
          team1Id: 't-1',
          team2Id: 't-2',
          date: '2026-10-08T23:30:00.000Z',
          iscompleted: false,
          team2Details: { name: 'Hawks', image_url: null, logo_url: null },
        },
      ],
      isLoadingMatches: false,
    });
    renderPage();

    const strip = screen.getByRole('region', { name: 'Next match' });
    expect(strip).toHaveTextContent('vs Hawks');
    expect(screen.getByRole('link', { name: /next match/i })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/schedule\?date=\d{4}-\d{2}-\d{2}#match-m-next$/)
    );
  });

  it('shows no next-match strip when nothing is left to play', () => {
    renderPage();
    expect(screen.queryByRole('region', { name: 'Next match' })).not.toBeInTheDocument();
  });

  it('shows match-history empty surface when there are no past matches', () => {
    mockUseTeamMatches.mockReturnValue({
      pastMatches: [],
      upcomingMatches: [],
      isLoadingMatches: false,
    });
    renderPage();
    expect(screen.getByText('No Match History')).toBeInTheDocument();
  });

  it('navigates back when Back is pressed', () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: /back/i })[0]);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('pops history rather than pushing the origin route again', () => {
    // Arriving from /stats used to push '/stats' back on, which mounted that
    // page at the top and then smooth-scrolled down. Popping lets the origin
    // page restore its own position.
    renderPage({ pathname: '/teams/falcons', state: { from: '/stats' } });
    fireEvent.click(screen.getAllByRole('button', { name: /back/i })[0]);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
    expect(mockNavigate).not.toHaveBeenCalledWith('/stats');
  });

  // UX audit T-03: Match History is the section a player came for, and it used
  // to cost a tap; the sections could not be linked to at all.
  describe('linking to a section', () => {
    const sectionNamed = (title: string) =>
      screen.getByRole('heading', { name: title }).closest('section');

    it('opens Match History without a tap', () => {
      renderPage();

      expect(screen.getByTestId('match-history')).toHaveAttribute('data-open', 'true');
    });

    it('leaves the other sections closed when nothing is named', () => {
      renderPage();

      expect(sectionNamed('Stats & Report Card')).toHaveAttribute('data-open', 'false');
      expect(sectionNamed('Matchups & Rivalries')).toHaveAttribute('data-open', 'false');
      expect(sectionNamed('Career & Achievements')).toHaveAttribute('data-open', 'false');
    });

    it('opens the section the address names', () => {
      renderPage('/teams/falcons#h2h');

      expect(sectionNamed('Matchups & Rivalries')).toHaveAttribute('data-open', 'true');
      expect(sectionNamed('Stats & Report Card')).toHaveAttribute('data-open', 'false');
    });

    it('scrolls to the section the address names, once the team has arrived', () => {
      const scrollIntoView = vi.fn();
      vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollIntoView);

      renderPage('/teams/falcons#career');

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });

    it('ignores an address naming something that is not a section', () => {
      const scrollIntoView = vi.fn();
      vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollIntoView);

      renderPage('/teams/falcons#nowhere');

      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(sectionNamed('Stats & Report Card')).toHaveAttribute('data-open', 'false');
    });
  });

  // A team answers at two addresses. Echoing back whichever one the visitor
  // arrived at had the same page declare itself the original twice over, so a
  // search engine saw two pages where there is one.
  describe('the address it declares as its own', () => {
    const canonicalOf = () =>
      (mockSeoHead.mock.calls.at(-1)?.[0] as { path: string } | undefined)?.path;

    it('is the readable name when reached by the readable name', () => {
      renderPage('/teams/falcons');

      expect(canonicalOf()).toBe('/teams/falcons');
    });

    it('is still the readable name when reached by the row id', () => {
      renderPage('/teams/4f1a2b3c-0000-4000-8000-000000000001');

      expect(canonicalOf()).toBe('/teams/falcons');
    });

    // teams.name has no unique constraint. The readable address reaches
    // whichever team useResolveTeamSlug finds first, so the other one must not
    // claim it: it would publish a canonical pointing at a rival's page and be
    // dropped from the index as a copy of it.
    it('is the row id when another team owns that readable address', () => {
      mockUseTeamsQuery.mockReturnValue({
        data: [
          { id: 't-0', name: 'Falcons' },
          { id: 't-1', name: 'Falcons' },
        ],
      });

      renderPage('/teams/falcons');

      expect(canonicalOf()).toBe('/teams/t-1');
    });

    it('sends the same address into the structured data', () => {
      renderPage('/teams/4f1a2b3c-0000-4000-8000-000000000001');

      const props = mockSeoHead.mock.calls.at(-1)?.[0] as {
        jsonLd: { url: string };
      };
      expect(props.jsonLd.url).toBe('https://717rec.app/teams/falcons');
    });
  });
});
