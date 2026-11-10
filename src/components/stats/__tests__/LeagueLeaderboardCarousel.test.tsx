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
    // The name may be cut at two lines; the full name stays in the title.
    expect(screen.getByTitle('Bravo')).toHaveTextContent('Bravo');
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  // jsdom does no layout, so this pins the classes. On a phone the title column
  // took a third of the row and the three cards cut every name to "Fake Team...".
  it('puts the title on one line above the cards below 640px, and on their left from 640px', () => {
    renderCarousel([
      makeRanking({ teamId: 'a', teamName: 'Alpha', powerScore: 90 }),
      makeRanking({ teamId: 'b', teamName: 'Bravo', powerScore: 80 }),
      makeRanking({ teamId: 'c', teamName: 'Charlie', powerScore: 70 }),
    ]);

    const title = screen.getByText('Leaderboard').parentElement;
    expect([...(title?.children ?? [])].map((part) => part.textContent)).toEqual([
      'League',
      'Leaderboard',
      '3 teams',
    ]);
    expect(title).toHaveClass('flex', 'flex-wrap', 'gap-x-1', 'sm:flex-col', 'sm:pt-1');
    expect(title).not.toHaveClass('flex-col', 'pt-1');

    const row = title?.parentElement;
    expect(row).toHaveClass('flex', 'flex-col', 'sm:flex-row', 'sm:items-start');
    expect(row).not.toHaveClass('items-start');
  });

  // The cards scroll sideways, so the strip cuts off anything outside it. The
  // rank badges sit 6px above and 2px left of their card.
  it('leaves room in the card strip for the rank badges on a phone', () => {
    renderCarousel([makeRanking({ teamId: 'a', teamName: 'Alpha', powerScore: 90 })]);

    const strip = screen.getByRole('link').parentElement;
    expect(strip).toHaveClass('overflow-x-auto', 'pt-1.5', 'pl-0.5', 'sm:pt-0', 'sm:pl-0');
  });
});
