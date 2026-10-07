import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { Ranking } from '@/types';

import LeagueLeaderboardCarousel from '../LeagueLeaderboardCarousel';

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

const makeRanking = (overrides: Partial<Ranking> = {}): Ranking => ({
  teamId: 'team-1',
  teamName: 'Team One',
  wins: 6,
  losses: 2,
  winPercentage: 0.75,
  gamesWon: 14,
  gamesLost: 6,
  gameWinPercentage: 0.7,
  sos: 0.62,
  powerScore: 71.3,
  divisionName: 'Competitive',
  headToHead: {},
  closeMatchLosses: 0,
  ...overrides,
});

const renderCarousel = (rankings: Ranking[]) =>
  render(
    <MemoryRouter>
      <LeagueLeaderboardCarousel rankings={rankings} />
    </MemoryRouter>
  );

describe('LeagueLeaderboardCarousel', () => {
  it('shows nothing when no team is ranked yet', () => {
    const { container } = renderCarousel([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('titles the board with the team count and shows only the top three by Power Score', () => {
    renderCarousel([
      makeRanking({ teamId: 'a', teamName: 'Alpha', powerScore: 40 }),
      makeRanking({ teamId: 'b', teamName: 'Bravo', powerScore: 90 }),
      makeRanking({ teamId: 'c', teamName: 'Charlie', powerScore: 70 }),
      makeRanking({ teamId: 'd', teamName: 'Delta', powerScore: 60 }),
    ]);

    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('4 teams')).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveTextContent('Bravo');
    expect(links[1]).toHaveTextContent('Charlie');
    expect(links[2]).toHaveTextContent('Delta');
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });
});
