import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

let mockIsMobile = false;
vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

vi.mock('@/components/stats/CompactStandings', () => ({
  default: ({ rankings }: { rankings: Array<{ teamId: string }> }) => (
    <div data-testid="compact-standings" data-count={rankings.length} />
  ),
}));

import { Ranking } from '@/types';

import StatsSummarySection from '../StatsSummarySection';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeRanking = (teamId: string, wins: number, losses: number): Ranking => ({
  teamId,
  teamName: `Team ${teamId}`,
  wins,
  losses,
  winPercentage: wins + losses > 0 ? wins / (wins + losses) : 0,
  gamesWon: wins,
  gamesLost: losses,
  gameWinPercentage: 0.5,
  sos: 0.5,
  powerScore: 50,
  headToHead: {},
  closeMatchLosses: 0,
});

const playedRankings = Array.from({ length: 7 }, (_, i) => makeRanking(`t${i}`, i + 1, 1));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('StatsSummarySection', () => {
  const scrollToFullRankings = vi.fn();

  beforeEach(() => {
    mockIsMobile = false;
    scrollToFullRankings.mockReset();
  });

  it('shows the Current Standings title', () => {
    render(
      <StatsSummarySection rankings={playedRankings} scrollToFullRankings={scrollToFullRankings} />
    );
    expect(screen.getByText('Current Standings')).toBeInTheDocument();
  });

  it('limits the compact standings to the top 5 teams', () => {
    render(
      <StatsSummarySection rankings={playedRankings} scrollToFullRankings={scrollToFullRankings} />
    );
    expect(screen.getByTestId('compact-standings')).toHaveAttribute('data-count', '5');
  });

  it('calls scrollToFullRankings when View Full Standings is clicked', async () => {
    render(
      <StatsSummarySection rankings={playedRankings} scrollToFullRankings={scrollToFullRankings} />
    );
    await userEvent.click(screen.getByRole('button', { name: /view full standings/i }));
    expect(scrollToFullRankings).toHaveBeenCalledTimes(1);
  });

  it('shows the new-season banner when every team is 0-0', () => {
    const freshSeason = [makeRanking('a', 0, 0), makeRanking('b', 0, 0)];
    render(
      <StatsSummarySection rankings={freshSeason} scrollToFullRankings={scrollToFullRankings} />
    );
    expect(screen.getByText(/new season starting/i)).toBeInTheDocument();
  });

  it('hides the new-season banner once matches have been played', () => {
    render(
      <StatsSummarySection rankings={playedRankings} scrollToFullRankings={scrollToFullRankings} />
    );
    expect(screen.queryByText(/new season starting/i)).not.toBeInTheDocument();
  });

  it('hides the new-season banner when there are no teams at all', () => {
    render(<StatsSummarySection rankings={[]} scrollToFullRankings={scrollToFullRankings} />);
    expect(screen.queryByText(/new season starting/i)).not.toBeInTheDocument();
  });

  it('collapses the standings when the header is clicked', async () => {
    render(
      <StatsSummarySection rankings={playedRankings} scrollToFullRankings={scrollToFullRankings} />
    );
    expect(screen.getByTestId('compact-standings')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /current standings/i }));

    expect(screen.queryByTestId('compact-standings')).not.toBeInTheDocument();
  });

  it('hides the description text on mobile', () => {
    mockIsMobile = true;
    render(
      <StatsSummarySection rankings={playedRankings} scrollToFullRankings={scrollToFullRankings} />
    );
    expect(screen.queryByText(/top 5 teams based on performance/i)).not.toBeInTheDocument();
  });
});
