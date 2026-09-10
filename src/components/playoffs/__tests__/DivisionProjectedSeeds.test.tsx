import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProjectedSeedsResult } from '@/hooks/playoffs/useProjectedSeeds';

import DivisionProjectedSeeds from '../DivisionProjectedSeeds';

const mockUseProjectedSeeds = vi.fn();

vi.mock('@/hooks/playoffs/useProjectedSeeds', () => ({
  useProjectedSeeds: (seasonId: string | null) => mockUseProjectedSeeds(seasonId),
}));

const NO_BRACKETS = 'No brackets yet for this division';

const result = (overrides: Partial<ProjectedSeedsResult> = {}): ProjectedSeedsResult => ({
  seedsByDivision: {
    Competitive: [
      { seed: 1, teamId: 'a', teamName: 'Bag Ass Bandits', powerScore: 91.25 },
      { seed: 2, teamId: 'b', teamName: 'Cuzzo Crew', powerScore: 80 },
      { seed: 3, teamId: 'c', teamName: 'New Team', powerScore: null },
    ],
  },
  finalWeek: 10,
  isReady: true,
  ...overrides,
});

const renderSeeds = (division = 'Competitive', seasonId: string | null = 'season-active') =>
  render(
    <MemoryRouter>
      <DivisionProjectedSeeds division={division} seasonId={seasonId} />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockUseProjectedSeeds.mockReturnValue(result());
});

describe('DivisionProjectedSeeds', () => {
  it('lists the division in seed order with its power scores', () => {
    renderSeeds();

    const rows = within(
      screen.getByRole('list', { name: 'Competitive projected seeds' })
    ).getAllByRole('listitem');

    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('1');
    expect(rows[0]).toHaveTextContent('Bag Ass Bandits');
    expect(rows[0]).toHaveTextContent('91.3');
    expect(rows[1]).toHaveTextContent('Cuzzo Crew');
    expect(rows[1]).toHaveTextContent('80.0');
  });

  it('shows a dash rather than a zero for a team with no power score', () => {
    renderSeeds();

    const rows = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(rows[2]).toHaveTextContent('New Team');
    expect(rows[2]).toHaveTextContent('—');
    expect(rows[2]).not.toHaveTextContent('0.0');
  });

  it('names the week the brackets open', () => {
    renderSeeds();

    expect(screen.getByText(/Brackets open after week 10\./)).toBeInTheDocument();
    expect(screen.queryByText(NO_BRACKETS)).not.toBeInTheDocument();
  });

  it('says only that the season has to end when there is no end date', () => {
    mockUseProjectedSeeds.mockReturnValue(result({ finalWeek: null }));
    renderSeeds();

    expect(screen.getByText(/Brackets open when the regular season ends\./)).toBeInTheDocument();
    expect(screen.queryByText(/after week/)).not.toBeInTheDocument();
  });

  it('links to the standings', () => {
    renderSeeds();

    expect(screen.getByRole('link', { name: /see the full standings/i })).toHaveAttribute(
      'href',
      '/stats'
    );
  });

  it('keeps the old sentence for a season whose seeds cannot be trusted', () => {
    mockUseProjectedSeeds.mockReturnValue(
      result({ seedsByDivision: {}, finalWeek: null, isReady: false })
    );
    renderSeeds('Competitive', 'season-2024');

    expect(screen.getByText(NO_BRACKETS)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('keeps the old sentence while the rankings are still loading', () => {
    mockUseProjectedSeeds.mockReturnValue(result({ seedsByDivision: {}, isReady: false }));
    renderSeeds();

    expect(screen.getByText(NO_BRACKETS)).toBeInTheDocument();
  });

  it('keeps the old sentence for a division with no teams', () => {
    renderSeeds('Recreational');

    expect(screen.getByText(NO_BRACKETS)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('passes the season it was given to the hook', () => {
    renderSeeds('Competitive', 'season-active');

    expect(mockUseProjectedSeeds).toHaveBeenCalledWith('season-active');
  });
});
