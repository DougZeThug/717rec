import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, className }, ref) => (
        <div ref={ref} className={className}>
          {children}
        </div>
      )
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

let mockInView = true;
vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: mockInView }),
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

let mockAllBadges: Array<{ team_id: string; id: string }> | undefined;
vi.mock('@/hooks/useTeamBadges', () => ({
  useAllTeamBadges: () => ({ data: mockAllBadges }),
}));

vi.mock('@/utils/logger', () => ({ debugLog: vi.fn() }));

vi.mock('../LeagueLeaderboardCarousel', () => ({
  default: () => <div data-testid="leaderboard-carousel" />,
}));

vi.mock('../TeamSearchDrawer', () => ({
  default: ({ open }: { open: boolean }) => (
    <div data-testid="search-drawer" data-open={String(open)} />
  ),
}));

vi.mock('../ViewToggle', () => ({
  default: ({ view }: { view: string }) => <div data-testid="view-toggle" data-view={view} />,
}));

vi.mock('../RankingCard', () => ({
  default: ({
    ranking,
    index,
    compactView,
    showDivision,
    prefetchedBadges,
  }: {
    ranking: { teamId: string; teamName: string };
    index: number;
    compactView?: boolean;
    showDivision?: boolean;
    prefetchedBadges?: unknown[];
  }) => (
    <div
      data-testid={`card-${ranking.teamId}`}
      data-index={index}
      data-compact={String(compactView)}
      data-show-division={String(showDivision)}
      data-badge-count={prefetchedBadges?.length ?? 0}
    >
      {ranking.teamName}
    </div>
  ),
}));

import { Ranking } from '@/types';

import RankingsMobileView from '../RankingsMobileView';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeRanking = (teamId: string, divisionName: string, powerScore: number): Ranking => ({
  teamId,
  teamName: `Team ${teamId}`,
  wins: 1,
  losses: 1,
  winPercentage: 0.5,
  gamesWon: 2,
  gamesLost: 2,
  gameWinPercentage: 0.5,
  sos: 0.5,
  powerScore,
  divisionName,
  headToHead: {},
  closeMatchLosses: 0,
});

const rankings = [
  makeRanking('a', 'Competitive', 90),
  makeRanking('b', 'Competitive', 80),
  makeRanking('c', 'Recreational', 70),
];

const defaultProps = {
  rankings,
  expandedTeam: null,
  toggleExpand: vi.fn(),
  sortOptions: { field: 'powerScore', direction: 'desc' as const },
  onSortChange: vi.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RankingsMobileView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockInView = true;
    mockAllBadges = undefined;
  });

  it('renders a card for every team', () => {
    render(<RankingsMobileView {...defaultProps} />);
    expect(screen.getByTestId('card-a')).toBeInTheDocument();
    expect(screen.getByTestId('card-b')).toBeInTheDocument();
    expect(screen.getByTestId('card-c')).toBeInTheDocument();
  });

  it('shows division headers with team counts', () => {
    render(<RankingsMobileView {...defaultProps} />);
    expect(screen.getByText('Competitive')).toBeInTheDocument();
    expect(screen.getByText('Recreational')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('hides division headers in unified view', () => {
    render(<RankingsMobileView {...defaultProps} showUnified />);
    expect(screen.queryByText('Competitive')).not.toBeInTheDocument();
    expect(screen.getByTestId('card-a')).toHaveAttribute('data-show-division', 'true');
  });

  it('passes the global (not per-division) index to each card', () => {
    render(<RankingsMobileView {...defaultProps} />);
    expect(screen.getByTestId('card-c')).toHaveAttribute('data-index', '2');
  });

  it('defaults to compact cards with no sort pills', () => {
    render(<RankingsMobileView {...defaultProps} />);
    expect(screen.getByTestId('card-a')).toHaveAttribute('data-compact', 'true');
    expect(screen.queryByRole('button', { name: /win %/i })).not.toBeInTheDocument();
  });

  it('switches to detailed cards and shows sort pills when Detailed is selected', async () => {
    render(<RankingsMobileView {...defaultProps} />);

    await userEvent.click(screen.getByRole('radio', { name: 'Detailed' }));

    expect(screen.getByTestId('card-a')).toHaveAttribute('data-compact', 'false');
    expect(screen.getByRole('button', { name: 'Win %' })).toBeInTheDocument();
    expect(localStorage.getItem('rankingsDetailedView')).toBe('true');
  });

  it('restores the detailed view preference from localStorage', () => {
    localStorage.setItem('rankingsDetailedView', 'true');
    render(<RankingsMobileView {...defaultProps} />);
    expect(screen.getByTestId('card-a')).toHaveAttribute('data-compact', 'false');
  });

  it('calls onSortChange when a sort pill is clicked', async () => {
    localStorage.setItem('rankingsDetailedView', 'true');
    render(<RankingsMobileView {...defaultProps} />);

    await userEvent.click(screen.getByRole('button', { name: 'Win %' }));
    expect(defaultProps.onSortChange).toHaveBeenCalledWith('winPercentage');
  });

  it('renders the ViewToggle only when onViewChange is provided', () => {
    const { rerender } = render(<RankingsMobileView {...defaultProps} />);
    expect(screen.queryByTestId('view-toggle')).not.toBeInTheDocument();

    rerender(<RankingsMobileView {...defaultProps} view="all" onViewChange={vi.fn()} />);
    expect(screen.getByTestId('view-toggle')).toHaveAttribute('data-view', 'all');
  });

  it('shows a search FAB that opens the drawer when the user has no team', async () => {
    render(<RankingsMobileView {...defaultProps} />);

    expect(screen.getByTestId('search-drawer')).toHaveAttribute('data-open', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Search for a team' }));
    expect(screen.getByTestId('search-drawer')).toHaveAttribute('data-open', 'true');
  });

  it('labels the FAB for scrolling when the user has a team', () => {
    render(<RankingsMobileView {...defaultProps} myTeamId="team-a" />);
    expect(screen.getByRole('button', { name: 'Scroll to my team' })).toBeInTheDocument();
  });

  it('hides the FAB when the standings section is out of view', () => {
    mockInView = false;
    render(<RankingsMobileView {...defaultProps} />);
    expect(screen.queryByRole('button', { name: 'Search for a team' })).not.toBeInTheDocument();
  });

  it('distributes prefetched badges to the matching team cards', () => {
    mockAllBadges = [
      { team_id: 'a', id: 'badge-1' },
      { team_id: 'a', id: 'badge-2' },
      { team_id: 'c', id: 'badge-3' },
    ];
    render(<RankingsMobileView {...defaultProps} />);

    expect(screen.getByTestId('card-a')).toHaveAttribute('data-badge-count', '2');
    expect(screen.getByTestId('card-b')).toHaveAttribute('data-badge-count', '0');
    expect(screen.getByTestId('card-c')).toHaveAttribute('data-badge-count', '1');
  });
});
