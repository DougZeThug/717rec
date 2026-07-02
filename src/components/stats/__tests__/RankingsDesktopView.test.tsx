import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

vi.mock('../desktop/DivisionRankingsSection', () => ({
  default: ({
    divisionName,
    rankings,
    showUnified,
    isLight,
  }: {
    divisionName: string;
    rankings: { teamId: string }[];
    showUnified?: boolean;
    isLight?: boolean;
  }) => (
    <div
      data-testid={`division-${divisionName}`}
      data-count={rankings.length}
      data-unified={String(showUnified)}
      data-light={String(isLight)}
    />
  ),
}));

import { Ranking } from '@/types';

import RankingsDesktopView from '../RankingsDesktopView';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeRanking = (teamId: string, divisionName?: string): Ranking => ({
  teamId,
  teamName: `Team ${teamId}`,
  wins: 1,
  losses: 1,
  winPercentage: 0.5,
  gamesWon: 2,
  gamesLost: 2,
  gameWinPercentage: 0.5,
  sos: 0.5,
  powerScore: 50,
  divisionName,
  headToHead: {},
  closeMatchLosses: 0,
});

const defaultProps = {
  expandedTeam: null,
  toggleExpand: vi.fn(),
  sortOptions: { field: 'powerScore', direction: 'desc' as const },
  onSortChange: vi.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RankingsDesktopView', () => {
  it('renders one section per division', () => {
    render(
      <RankingsDesktopView
        rankings={[
          makeRanking('a', 'Competitive'),
          makeRanking('b', 'Recreational'),
          makeRanking('c', 'Competitive'),
        ]}
        {...defaultProps}
      />
    );

    expect(screen.getByTestId('division-Competitive')).toHaveAttribute('data-count', '2');
    expect(screen.getByTestId('division-Recreational')).toHaveAttribute('data-count', '1');
  });

  it('groups teams without a division under "Unassigned"', () => {
    render(<RankingsDesktopView rankings={[makeRanking('a', undefined)]} {...defaultProps} />);
    expect(screen.getByTestId('division-Unassigned')).toHaveAttribute('data-count', '1');
  });

  it('renders a single "All Teams" section in unified view', () => {
    render(
      <RankingsDesktopView
        rankings={[makeRanking('a', 'Competitive'), makeRanking('b', 'Recreational')]}
        {...defaultProps}
        showUnified
      />
    );

    expect(screen.getByTestId('division-All Teams')).toHaveAttribute('data-count', '2');
    expect(screen.queryByTestId('division-Competitive')).not.toBeInTheDocument();
    expect(screen.getByTestId('division-All Teams')).toHaveAttribute('data-unified', 'true');
  });

  it('passes the resolved light theme down to sections', () => {
    render(<RankingsDesktopView rankings={[makeRanking('a', 'Competitive')]} {...defaultProps} />);
    expect(screen.getByTestId('division-Competitive')).toHaveAttribute('data-light', 'true');
  });

  it('renders nothing for an empty rankings list', () => {
    const { container } = render(<RankingsDesktopView rankings={[]} {...defaultProps} />);
    expect(container.querySelector('[data-testid^="division-"]')).toBeNull();
  });
});
