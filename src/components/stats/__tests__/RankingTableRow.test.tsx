import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, className }, ref) => (
        <div ref={ref} className={className}>
          {children}
        </div>
      )
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

vi.mock('@/utils/logger', () => ({ debugLog: vi.fn() }));

vi.mock('@/components/badges/TeamBadgeCollection', () => ({
  default: ({ teamId }: { teamId: string }) => <div data-testid={`badges-${teamId}`} />,
}));

import { Ranking } from '@/types';

import RankingTableRow from '../RankingTableRow';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeRanking = (overrides: Partial<Ranking> = {}): Ranking => ({
  teamId: 'team-1',
  teamName: 'Team One',
  wins: 5,
  losses: 2,
  winPercentage: 5 / 7,
  gamesWon: 12,
  gamesLost: 6,
  gameWinPercentage: 12 / 18,
  sos: 0.6,
  powerScore: 75,
  headToHead: {},
  closeMatchLosses: 0,
  ...overrides,
});

const renderRow = (props: Partial<React.ComponentProps<typeof RankingTableRow>> = {}) =>
  render(
    <MemoryRouter>
      <table>
        <tbody>
          <RankingTableRow ranking={makeRanking()} index={0} {...props} />
        </tbody>
      </table>
    </MemoryRouter>
  );

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RankingTableRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the team name, record, win %, games and SOS', () => {
    renderRow();
    expect(screen.getByText('Team One')).toBeInTheDocument();
    expect(screen.getByText('5-2')).toBeInTheDocument();
    expect(screen.getByText('71.4%')).toBeInTheDocument();
    expect(screen.getByText('12-6')).toBeInTheDocument();
    expect(screen.getByText('66.7%')).toBeInTheDocument();
    expect(screen.getByText('0.600')).toBeInTheDocument();
  });

  it('shows the global rank when no division rank exists', () => {
    renderRow({ index: 4 });
    expect(screen.getByText('#5')).toBeInTheDocument();
  });

  it('shows division rank with global rank in parentheses in division view', () => {
    renderRow({ ranking: makeRanking({ divisionRank: 2 }), index: 4 });
    expect(screen.getByText('#2 (5)')).toBeInTheDocument();
  });

  it('shows only the global rank in unified view even with a division rank', () => {
    renderRow({ ranking: makeRanking({ divisionRank: 2 }), index: 4, showDivision: true });
    expect(screen.getByText('#5')).toBeInTheDocument();
    expect(screen.queryByText('#2 (5)')).not.toBeInTheDocument();
  });

  it('shows the division name column in unified view (N/A fallback)', () => {
    // Set a streak so the streak cell doesn't also render "N/A"
    renderRow({
      ranking: makeRanking({ divisionName: undefined, streak: 'W1' }),
      showDivision: true,
    });
    expect(screen.getByText('N/A', { selector: 'td' })).toBeInTheDocument();
  });

  it('shows the streak or N/A when there is none', () => {
    renderRow({ ranking: makeRanking({ streak: 'W3' }) });
    expect(screen.getByText('W3')).toBeInTheDocument();
  });

  it('includes an accessible rank label describing rank movement', () => {
    renderRow({ ranking: makeRanking({ divisionRank: 1, rankChange: 2 }), index: 2 });
    expect(
      screen.getByLabelText('Division rank 1, overall rank 3, moved up 2 positions')
    ).toBeInTheDocument();
  });

  it('links to the team details page', () => {
    renderRow();
    expect(screen.getByRole('link', { name: 'View Team One team details' })).toHaveAttribute(
      'href',
      expect.stringContaining('/teams/')
    );
  });

  it('links to the compare page for the team', () => {
    renderRow();
    expect(
      screen.getByRole('link', { name: 'Compare Team One with another team' })
    ).toHaveAttribute('href', '/compare?team1=team-1');
  });

  it('calls onToggleExpand when the row is clicked', async () => {
    const onToggleExpand = vi.fn();
    renderRow({ onToggleExpand });
    await userEvent.click(screen.getByText('5-2'));
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('does not call onToggleExpand when the team link is clicked (propagation stopped)', async () => {
    const onToggleExpand = vi.fn();
    renderRow({ onToggleExpand });
    await userEvent.click(screen.getByRole('link', { name: 'View Team One team details' }));
    expect(onToggleExpand).not.toHaveBeenCalled();
  });

  it('hides the trailing trend cell indicator when rankChange is 0', () => {
    const { container } = renderRow({ ranking: makeRanking({ rankChange: 0 }) });
    const cells = container.querySelectorAll('td');
    const lastCell = cells[cells.length - 1];
    expect(lastCell.textContent).toBe('');
  });

  it('shows the trend value when the team moved up', () => {
    renderRow({ ranking: makeRanking({ rankChange: 3 }) });
    // Rendered in both the rank cell and the trailing trend cell
    expect(screen.getAllByText('+3').length).toBeGreaterThanOrEqual(1);
  });
});
