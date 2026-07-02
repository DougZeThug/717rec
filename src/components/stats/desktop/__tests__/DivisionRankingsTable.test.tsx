import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

vi.mock('../../HeadToHeadRecords', () => ({
  default: ({ teamId }: { teamId: string }) => (
    <div data-testid="head-to-head" data-team={teamId} />
  ),
}));

import { Ranking } from '@/types';

import DivisionRankingsTable from '../DivisionRankingsTable';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeRanking = (teamId: string, overrides: Partial<Ranking> = {}): Ranking => ({
  teamId,
  teamName: `Team ${teamId}`,
  wins: 4,
  losses: 2,
  winPercentage: 4 / 6,
  gamesWon: 9,
  gamesLost: 5,
  gameWinPercentage: 9 / 14,
  sos: 0.61,
  powerScore: 66.666,
  divisionName: 'Competitive',
  streak: 'W2',
  headToHead: {},
  closeMatchLosses: 0,
  ...overrides,
});

const rankings = [makeRanking('b'), makeRanking('c', { wins: 1, losses: 5, winPercentage: 1 / 6 })];
const allRankings = [makeRanking('a'), ...rankings];

const defaultProps = {
  rankings,
  allRankings,
  expandedTeam: null,
  toggleExpand: vi.fn(),
  sortOptions: { field: 'powerScore', direction: 'desc' as const },
  onSortChange: vi.fn(),
  showUnified: false,
  isLight: true,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DivisionRankingsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders each team with name, record, win %, and power score', () => {
    render(<DivisionRankingsTable {...defaultProps} />);
    expect(screen.getByText('Team b')).toBeInTheDocument();
    expect(screen.getByText('4-2')).toBeInTheDocument();
    expect(screen.getByText('66.7%')).toBeInTheDocument();
    expect(screen.getAllByText('66.67')).toHaveLength(2); // power score toFixed(2)
    expect(screen.getByText('1-5')).toBeInTheDocument();
  });

  it('shows the overall rank based on allRankings order', () => {
    render(<DivisionRankingsTable {...defaultProps} />);
    // 'b' is second overall (index 1) → rank 2; 'c' → rank 3
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('appends the division rank in parentheses in division view', () => {
    render(
      <DivisionRankingsTable {...defaultProps} rankings={[makeRanking('b', { divisionRank: 1 })]} />
    );
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('hides the division rank suffix in unified view but shows the Division column', () => {
    render(
      <DivisionRankingsTable
        {...defaultProps}
        rankings={[makeRanking('b', { divisionRank: 1 })]}
        showUnified
      />
    );
    expect(screen.queryByText('(1)')).not.toBeInTheDocument();
    expect(screen.getByText('Division')).toBeInTheDocument();
    expect(screen.getByText('Competitive')).toBeInTheDocument();
  });

  it('renders the team image when available and an N/A block otherwise', () => {
    render(
      <DivisionRankingsTable
        {...defaultProps}
        rankings={[makeRanking('b', { imageUrl: 'https://example.com/b.png' }), makeRanking('c')]}
      />
    );
    expect(screen.getByAltText('Team b')).toHaveAttribute('src', 'https://example.com/b.png');
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('calls onSortChange when a sortable header is clicked', async () => {
    render(<DivisionRankingsTable {...defaultProps} />);
    await userEvent.click(screen.getByText('W-L'));
    expect(defaultProps.onSortChange).toHaveBeenCalledWith('wins');

    await userEvent.click(screen.getByText('Power Score'));
    expect(defaultProps.onSortChange).toHaveBeenCalledWith('powerScore');
  });

  it('shows head-to-head records for the expanded team only', () => {
    const { rerender } = render(<DivisionRankingsTable {...defaultProps} />);
    expect(screen.queryByTestId('head-to-head')).not.toBeInTheDocument();

    rerender(<DivisionRankingsTable {...defaultProps} expandedTeam="b" />);
    expect(screen.getByTestId('head-to-head')).toHaveAttribute('data-team', 'b');
  });

  it('shows the streak value', () => {
    render(<DivisionRankingsTable {...defaultProps} />);
    expect(screen.getAllByText('W2').length).toBeGreaterThanOrEqual(1);
  });
});
