import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let mockIsMobile = false;

vi.mock('@/hooks/usePowerScoreWeights', () => ({
  usePowerScoreWeights: () => ({ win: 40, sos: 45, game: 15 }),
}));

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

vi.mock('../RankingsTable', () => ({
  default: ({
    rankings,
    showUnified,
    myTeamId,
    view,
  }: {
    rankings: Array<{ teamId: string; teamName: string; powerScore: number }>;
    showUnified?: boolean;
    myTeamId?: string | null;
    view?: string;
  }) => (
    <div
      data-testid="rankings-table"
      data-view={view}
      data-unified={String(showUnified)}
      data-my-team={myTeamId ?? ''}
    >
      {rankings.map((ranking) => (
        <div
          key={ranking.teamId}
          data-testid="ranking-row"
          data-team={ranking.teamId}
          data-score={ranking.powerScore}
        >
          {ranking.teamName}
        </div>
      ))}
    </div>
  ),
}));

import { Ranking } from '@/types';

import FullRankings from '../FullRankings';

const ranking = (
  teamId: string,
  teamName: string,
  powerScore: number,
  divisionName: string
): Ranking => ({
  teamId,
  teamName,
  wins: 1,
  losses: 0,
  winPercentage: 1,
  gamesWon: 2,
  gamesLost: 0,
  gameWinPercentage: 1,
  sos: 0.5,
  powerScore,
  divisionName,
  headToHead: {},
  closeMatchLosses: 0,
});

const rankings = [
  ranking('low', 'Low Seed', 40, 'Classic'),
  ranking('high', 'High Seed', 90, 'Premier'),
  ranking('mid', 'Mid Seed', 70, 'Premier'),
];

describe('FullRankings', () => {
  beforeAll(() => {
    // jsdom has no pointer capture, which Radix's popover reaches for.
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile = false;
  });

  it('defaults to division view and passes rankings through without all-teams sorting', () => {
    render(<FullRankings rankings={rankings} myTeamId="mid" />);

    expect(screen.getByTestId('rankings-table')).toHaveAttribute('data-view', 'division');
    expect(screen.getByTestId('rankings-table')).toHaveAttribute('data-unified', 'false');
    expect(screen.getByTestId('rankings-table')).toHaveAttribute('data-my-team', 'mid');
    expect(screen.getAllByTestId('ranking-row').map((row) => row.dataset.team)).toEqual([
      'low',
      'high',
      'mid',
    ]);
  });

  it('switches to all-teams view and sorts populated rankings by power score', async () => {
    render(<FullRankings rankings={rankings} />);

    await userEvent.click(screen.getByRole('radio', { name: 'View All Teams' }));

    expect(screen.getByTestId('rankings-table')).toHaveAttribute('data-view', 'all');
    expect(screen.getByTestId('rankings-table')).toHaveAttribute('data-unified', 'true');
    expect(screen.getAllByTestId('ranking-row').map((row) => row.dataset.team)).toEqual([
      'high',
      'mid',
      'low',
    ]);
  });

  it('hides the division/all filter controls on mobile while keeping division rankings visible', () => {
    mockIsMobile = true;

    render(<FullRankings rankings={rankings} />);

    expect(screen.queryByRole('radio', { name: 'View All Teams' })).not.toBeInTheDocument();
    expect(screen.getByTestId('rankings-table')).toHaveAttribute('data-view', 'division');
  });

  it('explains the power score on the page, with the live weights and a colour legend', async () => {
    render(<FullRankings rankings={rankings} />);

    await userEvent.click(screen.getByRole('button', { name: 'What is Power Score?' }));

    expect(screen.getByText(/40% match win rate/)).toBeInTheDocument();
    expect(screen.getByText(/45% strength of schedule/)).toBeInTheDocument();
    expect(screen.getByText('85 and above')).toBeInTheDocument();
    expect(screen.getByText('Elite Performance')).toBeInTheDocument();
    expect(screen.getByText('under 20')).toBeInTheDocument();
  });

  it('offers the explanation on a phone too, where the one-line description is hidden', () => {
    mockIsMobile = true;

    render(<FullRankings rankings={rankings} />);

    expect(screen.queryByText(/Based on opponent-weighted win percentage/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'What is Power Score?' })).toBeInTheDocument();
  });
});
