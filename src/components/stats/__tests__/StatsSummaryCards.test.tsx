import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// SummaryCard animates with framer-motion; swap for a static card that keeps
// the title/value/description contract so we can assert on rendered content.
vi.mock('@/components/ui/summary-card', () => ({
  SummaryCard: ({
    title,
    value,
    description,
  }: {
    title: string;
    value: React.ReactNode;
    description?: string;
  }) => (
    <div data-testid={`summary-card-${title}`}>
      <h3>{title}</h3>
      <div data-testid={`value-${title}`}>{value}</div>
      {description && <p>{description}</p>}
    </div>
  ),
}));

import { Ranking } from '@/types';

import StatsSummaryCards from '../StatsSummaryCards';

const makeRanking = (overrides: Partial<Ranking> = {}): Ranking => ({
  teamId: 'team-1',
  teamName: 'Team One',
  wins: 5,
  losses: 2,
  winPercentage: 0.714,
  gamesWon: 12,
  gamesLost: 6,
  gameWinPercentage: 0.667,
  sos: 0.6,
  powerScore: 75,
  headToHead: {},
  closeMatchLosses: 0,
  ...overrides,
});

const rankings: Ranking[] = [
  makeRanking({ teamId: 'a', teamName: 'Aces', winPercentage: 0.9, sos: 0.55, powerScore: 82 }),
  makeRanking({ teamId: 'b', teamName: 'Bulls', winPercentage: 0.5, sos: 0.91, powerScore: 60 }),
  makeRanking({ teamId: 'c', teamName: 'Crows', winPercentage: 0.25, sos: 0.4, powerScore: 91.5 }),
];

describe('StatsSummaryCards', () => {
  it('shows the total number of teams', () => {
    render(<StatsSummaryCards rankings={rankings} />);
    expect(screen.getByTestId('value-Total Teams')).toHaveTextContent('3');
  });

  it('shows the highest win percentage and the team that owns it', () => {
    render(<StatsSummaryCards rankings={rankings} />);
    expect(screen.getByTestId('value-Highest Win %')).toHaveTextContent('90.0%');
    expect(screen.getByTestId('summary-card-Highest Win %')).toHaveTextContent('Aces');
  });

  it('shows the highest strength of schedule and the team that owns it', () => {
    render(<StatsSummaryCards rankings={rankings} />);
    expect(screen.getByTestId('value-Highest SOS')).toHaveTextContent('0.910');
    expect(screen.getByTestId('summary-card-Highest SOS')).toHaveTextContent('Bulls');
  });

  it('shows the highest power score formatted to one decimal', () => {
    render(<StatsSummaryCards rankings={rankings} />);
    expect(screen.getByTestId('value-Highest Power')).toHaveTextContent('91.5');
    expect(screen.getByTestId('summary-card-Highest Power')).toHaveTextContent('Crows');
  });

  it('falls back to zeros and "No teams" when rankings are empty', () => {
    render(<StatsSummaryCards rankings={[]} />);
    expect(screen.getByTestId('value-Total Teams')).toHaveTextContent('0');
    expect(screen.getByTestId('value-Highest Win %')).toHaveTextContent('0%');
    expect(screen.getAllByText('No teams').length).toBeGreaterThanOrEqual(3);
  });
});
