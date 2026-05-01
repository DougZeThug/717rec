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
const mockUseConfirmationSeason = vi.fn();
const mockUseMyNextMatch = vi.fn();
const mockUseIsMobile = vi.fn();

vi.mock('@/hooks/useTeams', () => ({ useTeams: () => mockUseTeams() }));
vi.mock('@/hooks/usePendingScoresMatches', () => ({ usePendingScoresMatches: () => mockUsePendingScoresMatches() }));
vi.mock('@/hooks/useHeroCards', () => ({ useHeroCards: () => mockUseHeroCards() }));
vi.mock('@/hooks/useWeeklyPowerScoreTrends', () => ({ useWeeklyPowerScoreTrends: (...args: unknown[]) => mockUseWeeklyPowerScoreTrends(...args) }));
vi.mock('@/hooks/useWeeklyRecap', () => ({ useWeeklyRecap: () => mockUseWeeklyRecap() }));
vi.mock('@/hooks/useSeasonParticipation', () => ({ useConfirmationSeason: () => mockUseConfirmationSeason() }));
vi.mock('@/hooks/useMyNextMatch', () => ({ useMyNextMatch: () => mockUseMyNextMatch() }));
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => mockUseIsMobile() }));

vi.mock('@/components/layout/PageLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/transitions/PageTransition', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/home/HeroSection', () => ({ default: () => <p>Hero Section</p> }));
vi.mock('@/components/hero/HeroCardSkeleton', () => ({ default: () => <p>Loading hero cards...</p> }));
vi.mock('@/components/home/MyNextMatchSkeleton', () => ({ default: () => <p>Loading next match...</p> }));
vi.mock('@/components/home/TeamOfTheWeekSkeleton', () => ({ default: () => <p>Loading team of week...</p> }));
vi.mock('@/components/home/WeeklyRecapSkeleton', () => ({ default: () => <p>Loading recap...</p> }));
vi.mock('@/components/home/LeagueHistoryBar', () => ({ default: () => <p>League History</p> }));
vi.mock('@/components/home/MyMatchesSection', () => ({ default: () => <p>My Matches</p> }));
vi.mock('@/components/home/PendingScoresCard', () => ({ default: () => <p>Pending Scores</p> }));
vi.mock('@/components/home/TeamOfTheWeekCard', () => ({ default: () => <p>Team Of Week</p> }));
vi.mock('@/components/home/WeeklyRecapCard', () => ({ default: () => <p>Weekly Recap</p> }));
vi.mock('@/components/hero/HeroCard', () => ({ default: () => <p>Hero Card</p> }));
vi.mock('@/components/hero/ParticipationHeroCard', () => ({ default: () => <p>Participation Card</p> }));
vi.mock('@/components/home/CallToAction', () => ({ default: () => <p>Call To Action</p> }));
vi.mock('@/components/home/TopTeams', () => ({ default: ({ teams }: { teams: Array<{ id: string }> }) => teams.length ? <p>Top Teams Loaded</p> : <p>No Top Teams</p> }));

const createTestQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const renderPage = () => render(<QueryClientProvider client={createTestQueryClient()}><MemoryRouter><Index /></MemoryRouter></QueryClientProvider>);

describe('Index page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobile.mockReturnValue(false);
    mockUseTeams.mockReturnValue({ teams: [{ id: 't-1', power_score: 80 }], isLoading: false });
    mockUsePendingScoresMatches.mockReturnValue({ matches: [], isLoading: false });
    mockUseHeroCards.mockReturnValue({ data: [{ id: 'h-1' }], isLoading: false });
    mockUseWeeklyPowerScoreTrends.mockReturnValue({ data: { trends: [], latestWeek: 5 }, isLoading: false });
    mockUseWeeklyRecap.mockReturnValue({ data: { hasData: false }, isLoading: false });
    mockUseConfirmationSeason.mockReturnValue({ data: null });
    mockUseMyNextMatch.mockReturnValue({ isLoading: false, hasTeamMembership: false, matches: [], myTeam: null, isPreviousMatches: false });
  });

  it('shows hero loading state and hides rendered hero cards', () => {
    mockUseHeroCards.mockReturnValue({ data: [], isLoading: true });
    renderPage();
    expect(screen.getByText('Loading hero cards...')).toBeInTheDocument();
    expect(screen.queryByText('Hero Card')).not.toBeInTheDocument();
  });

  it('wires success modules for default home state', () => {
    renderPage();
    expect(screen.getByText('Hero Section')).toBeInTheDocument();
    expect(screen.getByText('Loading hero cards...')).toBeInTheDocument();
    expect(screen.getByText('Top Teams Loaded')).toBeInTheDocument();
    expect(screen.getByText('Call To Action')).toBeInTheDocument();
    expect(screen.queryByText('My Matches')).not.toBeInTheDocument();
  });

  it('shows top-teams empty state when no teams are available', () => {
    mockUseTeams.mockReturnValue({ teams: [], isLoading: false });
    renderPage();
    expect(screen.getByText('No Top Teams')).toBeInTheDocument();
  });

  it('shows next-match section only when user has team membership and matches', () => {
    mockUseMyNextMatch.mockReturnValue({ isLoading: false, hasTeamMembership: true, matches: [{ id: 'm1' }], myTeam: { id: 't-1' }, isPreviousMatches: false });
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
});
