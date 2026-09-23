import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Index from '../Index';

const mockUseTeams = vi.fn();
const mockUsePendingScoresMatches = vi.fn();
const mockUseHeroCards = vi.fn();
const mockUseWeeklyPowerScoreTrends = vi.fn();
const mockUseWeeklyRecap = vi.fn();
const mockUsePublishedRecapEdition = vi.fn();
const mockUseConfirmationSeason = vi.fn();
const mockUseMyNextMatch = vi.fn();
const mockUseIsMobile = vi.fn();

vi.mock('@/hooks/useTeams', () => ({ useTeams: () => mockUseTeams() }));
vi.mock('@/hooks/usePendingScoresMatches', () => ({
  usePendingScoresMatches: () => mockUsePendingScoresMatches(),
}));
vi.mock('@/hooks/useHeroCards', () => ({ useHeroCards: () => mockUseHeroCards() }));
vi.mock('@/hooks/useWeeklyPowerScoreTrends', () => ({
  useWeeklyPowerScoreTrends: (...args: unknown[]) => mockUseWeeklyPowerScoreTrends(...args),
}));
vi.mock('@/hooks/useWeeklyRecap', () => ({ useWeeklyRecap: () => mockUseWeeklyRecap() }));
vi.mock('@/hooks/useRecapEditions', () => ({
  usePublishedRecapEdition: () => mockUsePublishedRecapEdition(),
}));
vi.mock('@/hooks/useSeasonParticipation', () => ({
  useConfirmationSeason: () => mockUseConfirmationSeason(),
}));
vi.mock('@/hooks/useMyNextMatch', () => ({ useMyNextMatch: () => mockUseMyNextMatch() }));
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => mockUseIsMobile() }));

vi.mock('@/components/seo/SeoHead', () => ({ default: () => null }));
vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/transitions/PageTransition', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/home/HeroSection', () => ({ default: () => <p>Hero Section</p> }));
vi.mock('@/components/hero/HeroCardSkeleton', () => ({
  default: () => <p>Loading hero cards...</p>,
}));
vi.mock('@/components/home/MyNextMatchSkeleton', () => ({
  default: () => <p>Loading next match...</p>,
}));
vi.mock('@/components/home/TeamOfTheWeekSkeleton', () => ({
  default: () => <p>Loading team of week...</p>,
}));
vi.mock('@/components/home/WeeklyRecapSkeleton', () => ({
  default: () => <p>Loading recap...</p>,
}));
vi.mock('@/components/home/LeagueHistoryBar', () => ({ default: () => <p>League History</p> }));
vi.mock('@/components/home/MyMatchesSection', () => ({ default: () => <p>My Matches</p> }));
vi.mock('@/components/home/PendingScoresCard', () => ({ default: () => <p>Pending Scores</p> }));
vi.mock('@/components/home/TeamOfTheWeekCard', () => ({ default: () => <p>Team Of Week</p> }));
vi.mock('@/components/home/WeeklyRecapCard', () => ({ default: () => <p>Weekly Recap</p> }));
vi.mock('@/components/hero/HeroCard', () => ({ default: () => <p>Hero Card</p> }));
vi.mock('@/components/hero/ParticipationHeroCard', () => ({
  default: () => <p>Participation Card</p>,
}));
vi.mock('@/components/home/ContactCard', () => ({ default: () => <p>Contact Card</p> }));
vi.mock('@/components/home/TopTeams', () => ({
  default: ({ teams }: { teams: Array<{ id: string }> }) =>
    teams.length ? <p>Top Teams Loaded</p> : <p>No Top Teams</p>,
}));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const renderPage = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('Index page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobile.mockReturnValue(false);
    mockUseTeams.mockReturnValue({ teams: [{ id: 't-1', power_score: 80 }], isLoading: false });
    mockUsePendingScoresMatches.mockReturnValue({ matches: [], isLoading: false });
    mockUseHeroCards.mockReturnValue({ data: [{ id: 'h-1' }], isLoading: false });
    mockUseWeeklyPowerScoreTrends.mockReturnValue({
      data: { trends: [], latestWeek: 5 },
      isLoading: false,
    });
    mockUseWeeklyRecap.mockReturnValue({ data: { hasData: false }, isLoading: false });
    // Default: nothing published, so the page shows the live recap card.
    mockUsePublishedRecapEdition.mockReturnValue({ data: null, isLoading: false });
    mockUseConfirmationSeason.mockReturnValue({ data: null });
    mockUseMyNextMatch.mockReturnValue({
      isLoading: false,
      hasTeamMembership: false,
      matches: [],
      myTeam: null,
      isPreviousMatches: false,
    });
  });

  it('shows hero loading state and hides rendered hero cards', () => {
    mockUseHeroCards.mockReturnValue({ data: [], isLoading: true });
    renderPage();
    expect(screen.getByText('Loading hero cards...')).toBeInTheDocument();
    expect(screen.queryByText('Hero Card')).not.toBeInTheDocument();
  });

  it('wires success modules for default home state', async () => {
    renderPage();
    expect(screen.getByText('Hero Section')).toBeInTheDocument();
    expect(screen.getByText('Loading hero cards...')).toBeInTheDocument();
    // TopTeams and ContactCard are lazy + Suspense, so resolve asynchronously
    expect(await screen.findByText('Top Teams Loaded')).toBeInTheDocument();
    expect(await screen.findByText('Contact Card')).toBeInTheDocument();
    expect(screen.queryByText('My Matches')).not.toBeInTheDocument();
  });

  it('shows top-teams empty state when no teams are available', () => {
    mockUseTeams.mockReturnValue({ teams: [], isLoading: false });
    renderPage();
    expect(screen.getByText('No Top Teams')).toBeInTheDocument();
  });

  it('shows next-match section only when user has team membership and matches', () => {
    mockUseMyNextMatch.mockReturnValue({
      isLoading: false,
      hasTeamMembership: true,
      matches: [{ id: 'm1' }],
      myTeam: { id: 't-1' },
      isPreviousMatches: false,
    });
    renderPage();
    expect(screen.getByText('My Matches')).toBeInTheDocument();
  });

  it('shows loading and success states for weekly recap', () => {
    mockUseWeeklyRecap.mockReturnValue({ data: null, isLoading: true });
    renderPage();
    expect(screen.getByText('Loading recap...')).toBeInTheDocument();

    mockUseWeeklyRecap.mockReturnValue({ data: { hasData: true }, isLoading: false });
    renderPage();
    expect(screen.getByText('Weekly Recap')).toBeInTheDocument();
  });

  // hasData counts upsets and hot streaks only, so a week whose only news is a
  // power-score mover used to lose the whole card — and the movers fetched for
  // it — even though WeeklyRecapCard renders a movers-only week quite happily.
  describe('a week with movers but no upsets or streaks', () => {
    const mover = (teamId: string, delta: number) => ({
      teamId,
      teamName: `Team ${teamId}`,
      division: 'Competitive',
      logoUrl: undefined,
      currentScore: 53.8,
      previousScore: 53.8 - delta,
      delta,
      percentChange: 0,
      currentWeek: 7,
      previousWeek: 6,
    });

    /** The page asks for risers ('up') and the single faller ('down') separately. */
    const withTrends = (up: ReturnType<typeof mover>[], down: ReturnType<typeof mover>[]) => {
      mockUseWeeklyPowerScoreTrends.mockImplementation((direction: string) => ({
        data: { trends: direction === 'down' ? down : up, latestWeek: 5 },
        isLoading: false,
      }));
    };

    it('still shows the recap when a riser below Team of the Week clears the threshold', () => {
      mockUseWeeklyRecap.mockReturnValue({ data: { hasData: false }, isLoading: false });
      // trends[0] is Team of the Week's; the recap starts at the second.
      withTrends([mover('a', 2.1), mover('b', 0.6)], []);

      renderPage();

      expect(screen.getByText('Weekly Recap')).toBeInTheDocument();
    });

    it('shows the published edition instead of the live card when one exists', () => {
      mockUseWeeklyRecap.mockReturnValue({ data: { hasData: true }, isLoading: false });
      withTrends([mover('a', 2.1)], []);
      mockUsePublishedRecapEdition.mockReturnValue({
        data: {
          edition: { id: 'e-1', status: 'published' },
          version: { id: 'v-1', headline: 'Corn Stars stay top', caption: 'Week 6 recap.' },
          facts: { seasonSlug: 'fall-2026', weekNumber: 6 },
        },
        isLoading: false,
      });

      renderPage();

      expect(screen.getByText('Corn Stars stay top')).toBeInTheDocument();
      expect(screen.getByText('Read the full recap')).toBeInTheDocument();
      // The live card must not also be drawn — one recap on the page, not two.
      expect(screen.queryByText('Weekly Recap')).not.toBeInTheDocument();
    });

    // This fallback is the rollback path: unpublishing an edition has to give
    // the page its old behaviour back, not an empty space.
    it('falls back to the live card when nothing is published', () => {
      mockUseWeeklyRecap.mockReturnValue({ data: { hasData: true }, isLoading: false });
      withTrends([mover('a', 2.1)], []);
      mockUsePublishedRecapEdition.mockReturnValue({ data: null, isLoading: false });

      renderPage();

      expect(screen.getByText('Weekly Recap')).toBeInTheDocument();
    });

    it('still shows the recap when only the faller clears the threshold', () => {
      mockUseWeeklyRecap.mockReturnValue({ data: { hasData: false }, isLoading: false });
      withTrends([mover('a', 2.1)], [mover('z', -0.8)]);

      renderPage();

      expect(screen.getByText('Weekly Recap')).toBeInTheDocument();
    });

    // The faller can decide whether the card shows at all, so the skeleton has
    // to wait for it too. Waiting on the risers alone let the block vanish while
    // the faller was still loading, then pop back in once it arrived.
    it('holds the skeleton while the faller is still loading', () => {
      mockUseWeeklyRecap.mockReturnValue({ data: { hasData: false }, isLoading: false });
      mockUseWeeklyPowerScoreTrends.mockImplementation((direction: string) =>
        direction === 'down'
          ? { data: undefined, isLoading: true }
          : { data: { trends: [mover('a', 2.1)], latestWeek: 5 }, isLoading: false }
      );

      renderPage();

      expect(screen.getByText('Loading recap...')).toBeInTheDocument();
    });

    it('leaves the recap out when every mover would round to zero', () => {
      mockUseWeeklyRecap.mockReturnValue({ data: { hasData: false }, isLoading: false });
      withTrends([mover('a', 2.1), mover('b', 0.02)], [mover('z', -0.01)]);

      renderPage();

      expect(screen.queryByText('Weekly Recap')).not.toBeInTheDocument();
    });
  });
});
