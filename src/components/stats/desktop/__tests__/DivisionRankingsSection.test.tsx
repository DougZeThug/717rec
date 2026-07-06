import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

let mockAllBadges: Array<{ team_id: string; id: string }> | undefined;
vi.mock('@/hooks/useTeamBadges', () => ({
  useAllTeamBadges: () => ({ data: mockAllBadges }),
}));

vi.mock('@/utils/logger', () => ({ debugLog: vi.fn() }));

vi.mock('../../RankingTableRow', () => ({
  default: ({
    ranking,
    index,
    showDivision,
    isExpanded,
    onToggleExpand,
    prefetchedBadges,
  }: {
    ranking: { teamId: string; teamName: string };
    index: number;
    showDivision?: boolean;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    prefetchedBadges?: unknown[];
  }) => (
    <tr
      data-testid={`row-${ranking.teamId}`}
      data-index={index}
      data-show-division={String(showDivision)}
      data-expanded={String(isExpanded)}
      data-badge-count={prefetchedBadges?.length ?? 0}
    >
      <td>
        <button data-testid={`toggle-${ranking.teamId}`} onClick={onToggleExpand}>
          {ranking.teamName}
        </button>
      </td>
    </tr>
  ),
}));

import { Ranking } from '@/types';

import DivisionRankingsSection from '../DivisionRankingsSection';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeRanking = (teamId: string): Ranking => ({
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
  divisionName: 'Competitive',
  headToHead: {},
  closeMatchLosses: 0,
});

const divisionTeams = [makeRanking('b'), makeRanking('c')];
const allRankings = [makeRanking('a'), makeRanking('b'), makeRanking('c')];

const defaultProps = {
  divisionName: 'Competitive',
  rankings: divisionTeams,
  allRankings,
  expandedTeam: null,
  toggleExpand: vi.fn(),
  sortOptions: { field: 'powerScore', direction: 'desc' as const },
  onSortChange: vi.fn(),
  isLight: true,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DivisionRankingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAllBadges = undefined;
  });

  it('renders the division heading', () => {
    render(<DivisionRankingsSection {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Competitive' })).toBeInTheDocument();
  });

  it('renders a row for each team with the global index from allRankings', () => {
    render(<DivisionRankingsSection {...defaultProps} />);
    // 'b' is at global index 1, 'c' at 2, even though they are rows 0/1 here
    expect(screen.getByTestId('row-b')).toHaveAttribute('data-index', '1');
    expect(screen.getByTestId('row-c')).toHaveAttribute('data-index', '2');
  });

  it('renders the standard column headers', () => {
    render(<DivisionRankingsSection {...defaultProps} />);
    const headerTexts = screen
      .getAllByRole('columnheader')
      .map((th) => th.textContent?.trim() ?? '');
    for (const header of ['Team', 'Power', 'W-L', 'Win %', 'SOS', 'Streak', 'Trend']) {
      expect(headerTexts).toContain(header);
    }
  });

  it('shows the Division column only in unified view', () => {
    const { rerender } = render(<DivisionRankingsSection {...defaultProps} />);
    expect(screen.queryByText('Division')).not.toBeInTheDocument();

    rerender(<DivisionRankingsSection {...defaultProps} showUnified />);
    expect(screen.getByText('Division')).toBeInTheDocument();
    expect(screen.getByTestId('row-b')).toHaveAttribute('data-show-division', 'true');
  });

  it('marks the active sort column with aria-sort', () => {
    render(
      <DivisionRankingsSection
        {...defaultProps}
        sortOptions={{ field: 'wins', direction: 'asc' }}
      />
    );
    const winsHeader = screen.getByText(/^W-L/).closest('th');
    expect(winsHeader).toHaveAttribute('aria-sort', 'ascending');
    const powerHeader = screen.getByText(/^Power/).closest('th');
    expect(powerHeader).toHaveAttribute('aria-sort', 'none');
  });

  it('calls onSortChange with the field when a header is clicked', async () => {
    render(<DivisionRankingsSection {...defaultProps} />);
    await userEvent.click(screen.getByText(/^Win %/));
    expect(defaultProps.onSortChange).toHaveBeenCalledWith('winPercentage');
  });

  it('flags the expanded team row', () => {
    render(<DivisionRankingsSection {...defaultProps} expandedTeam="c" />);
    expect(screen.getByTestId('row-c')).toHaveAttribute('data-expanded', 'true');
    expect(screen.getByTestId('row-b')).toHaveAttribute('data-expanded', 'false');
  });

  it('toggles a team when its row control is clicked', async () => {
    render(<DivisionRankingsSection {...defaultProps} />);
    await userEvent.click(screen.getByTestId('toggle-b'));
    expect(defaultProps.toggleExpand).toHaveBeenCalledWith('b');
  });

  it('hands each row its prefetched badges', () => {
    mockAllBadges = [
      { team_id: 'b', id: 'badge-1' },
      { team_id: 'b', id: 'badge-2' },
    ];
    render(<DivisionRankingsSection {...defaultProps} />);
    expect(screen.getByTestId('row-b')).toHaveAttribute('data-badge-count', '2');
    expect(screen.getByTestId('row-c')).toHaveAttribute('data-badge-count', '0');
  });
});
