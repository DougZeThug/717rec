import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import CareerRankingsMobileView from '@/components/stats/career/CareerRankingsMobileView';
import type { CareerSortOptions } from '@/components/stats/career/types';
import type { CareerRanking } from '@/types/career';

vi.mock('@/components/shared/TeamLogo', () => ({
  TeamLogo: ({ teamName }: { teamName: string }) => <img alt={teamName} src="" />,
}));

// Radix ToggleGroup drives the compact/detailed switch, and jsdom implements
// none of the pointer-capture API it calls.
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const ranking = (overrides: Partial<CareerRanking>): CareerRanking => ({
  teamId: 'team-1',
  teamName: 'Rail Riders',
  logoUrl: null,
  imageUrl: null,
  divisionName: 'Competitive',
  careerMatchWins: 20,
  careerMatchLosses: 10,
  careerWinPercentage: 0.667,
  careerGameWins: 45,
  careerGameLosses: 25,
  careerGameWinPercentage: 0.643,
  careerPlayoffWins: 3,
  careerPlayoffLosses: 1,
  careerPlayoffWinPercentage: 0.75,
  championships: 0,
  runnerUps: 0,
  careerSweepRate: 0.3,
  careerClutchWinPct: 0.5,
  careerClutchGame3s: 4,
  careerPowerScore: 1520,
  careerSos: 0.512,
  playoffFinishes: 2,
  ...overrides,
});

const rankings = [
  ranking({ teamId: 'team-1', teamName: 'Rail Riders', championships: 2, runnerUps: 1 }),
  ranking({
    teamId: 'team-2',
    teamName: 'Bag Bandits',
    careerMatchWins: 12,
    careerMatchLosses: 18,
    careerWinPercentage: 0.4,
    careerGameWinPercentage: 0.41,
    careerPowerScore: 1180,
  }),
];

const sortOptions: CareerSortOptions = { field: 'careerPowerScore', direction: 'desc' };

const renderView = (props: Partial<React.ComponentProps<typeof CareerRankingsMobileView>> = {}) => {
  const onSortChange = vi.fn();
  const view = render(
    <MemoryRouter>
      <CareerRankingsMobileView
        rankings={rankings}
        sortOptions={sortOptions}
        onSortChange={onSortChange}
        {...props}
      />
    </MemoryRouter>
  );
  return { ...view, onSortChange };
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('CareerRankingsMobileView', () => {
  it('starts in compact view and lists every team in order', () => {
    renderView();

    expect(screen.getByText('Rail Riders')).toBeInTheDocument();
    expect(screen.getByText('Bag Bandits')).toBeInTheDocument();
    // Compact cards show the rank, the record and a Power figure.
    expect(screen.getByText('20-10')).toBeInTheDocument();
    expect(screen.getByText('(66.7%)')).toBeInTheDocument();
    expect(screen.getAllByText('Power')).toHaveLength(2);

    // Sort pills belong to the detailed view only.
    expect(screen.queryByRole('button', { name: /Win %/ })).not.toBeInTheDocument();
  });

  it('shows a trophy count for a multiple-time champion', () => {
    renderView();
    expect(screen.getByText('×2')).toBeInTheDocument();
  });

  it('restores the detailed view from localStorage', () => {
    localStorage.setItem('careerRankingsDetailedView', 'true');
    renderView();

    // Detailed cards add per-stat tiles that the compact card has no room for.
    expect(screen.getAllByText('SOS')).not.toHaveLength(0);
    expect(screen.getAllByText('Game %')).toHaveLength(2);
    expect(screen.getAllByText('0.512')).toHaveLength(2);
  });

  it('switches to the detailed view and remembers the choice', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('radio', { name: /detailed/i }));

    expect(screen.getAllByText('Game %')).toHaveLength(2);
    expect(localStorage.getItem('careerRankingsDetailedView')).toBe('true');
  });

  it('switches back to compact and remembers that too', async () => {
    const user = userEvent.setup();
    localStorage.setItem('careerRankingsDetailedView', 'true');
    renderView();

    await user.click(screen.getByRole('radio', { name: /compact/i }));

    expect(screen.queryByText('Game %')).not.toBeInTheDocument();
    expect(localStorage.getItem('careerRankingsDetailedView')).toBe('false');
  });

  it('reports the field when a sort pill is pressed', async () => {
    const user = userEvent.setup();
    localStorage.setItem('careerRankingsDetailedView', 'true');
    const { onSortChange } = renderView();

    await user.click(screen.getByRole('button', { name: /Win %/ }));

    expect(onSortChange).toHaveBeenCalledWith('careerWinPercentage');
  });

  it('marks the active sort pill with a direction arrow', () => {
    localStorage.setItem('careerRankingsDetailedView', 'true');
    const { unmount } = renderView();

    const descPill = screen.getByRole('button', { name: /Power/ });
    expect(descPill.querySelector('svg.lucide-arrow-down')).not.toBeNull();
    unmount();

    renderView({ sortOptions: { field: 'careerPowerScore', direction: 'asc' } });
    const ascPill = screen.getByRole('button', { name: /Power/ });
    expect(ascPill.querySelector('svg.lucide-arrow-up')).not.toBeNull();
  });

  it('renders a runner-up marker for a team that never won', () => {
    localStorage.setItem('careerRankingsDetailedView', 'true');
    renderView({
      rankings: [ranking({ teamId: 'team-3', teamName: 'Corn Stars', runnerUps: 3 })],
    });

    expect(screen.getByText('🥈×3')).toBeInTheDocument();
  });

  it('links each team to its details page', () => {
    renderView();

    const link = screen.getByRole('link', { name: /View Rail Riders team details/ });
    expect(link).toHaveAttribute('href', '/teams/rail-riders');
  });

  it('renders an empty list without error when there are no rankings', () => {
    renderView({ rankings: [] });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('colours the game-win percentage by band', () => {
    localStorage.setItem('careerRankingsDetailedView', 'true');
    const bands: Array<[number, string]> = [
      [0.8, 'text-green-600'],
      [0.65, 'text-blue-600'],
      [0.45, 'text-orange-500'],
      [0.2, 'text-red-600'],
    ];

    for (const [pct, expectedClass] of bands) {
      const { unmount } = renderView({
        rankings: [ranking({ teamId: 'solo', careerGameWinPercentage: pct })],
      });

      const tile = screen.getByText('Game %').parentElement as HTMLElement;
      const value = within(tile).getByText(`${(pct * 100).toFixed(1)}%`);
      expect(value.className).toContain(expectedClass);

      unmount();
    }
  });
});
