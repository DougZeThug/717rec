import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

let mockIsMobile = false;

vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

vi.mock('@/components/stats/RankingsDesktopView', () => ({
  default: ({
    sortOptions,
    onSortChange,
    rankings,
    expandedTeam,
    toggleExpand,
  }: {
    sortOptions: { field: string; direction: string };
    onSortChange: (field: string) => void;
    rankings: { teamId: string; divisionRank?: number }[];
    expandedTeam: string | null;
    toggleExpand: (id: string) => void;
  }) => (
    <div
      data-testid="desktop-view"
      data-sort-field={sortOptions.field}
      data-sort-direction={sortOptions.direction}
      data-expanded-team={expandedTeam ?? ''}
    >
      <button data-testid="sort-powerScore" onClick={() => onSortChange('powerScore')}>
        Sort powerScore
      </button>
      <button data-testid="sort-wins" onClick={() => onSortChange('wins')}>
        Sort wins
      </button>
      {rankings.map((r) => (
        <div key={r.teamId} data-testid={`team-row-${r.teamId}`}>
          <span data-testid={`div-rank-${r.teamId}`}>{r.divisionRank ?? ''}</span>
          <button data-testid={`expand-${r.teamId}`} onClick={() => toggleExpand(r.teamId)}>
            Expand
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/stats/RankingsMobileView', () => ({
  default: ({
    sortOptions,
    onSortChange,
    rankings,
  }: {
    sortOptions: { field: string; direction: string };
    onSortChange: (field: string) => void;
    rankings: { teamId: string }[];
  }) => (
    <div
      data-testid="mobile-view"
      data-sort-field={sortOptions.field}
      data-sort-direction={sortOptions.direction}
    >
      <button data-testid="mobile-sort-wins" onClick={() => onSortChange('wins')}>
        Sort wins
      </button>
      {rankings.map((r) => (
        <div key={r.teamId} data-testid={`mobile-team-${r.teamId}`} />
      ))}
    </div>
  ),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { Ranking } from '@/types';

import RankingsTable from '../RankingsTable';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const divisionRankings: Ranking[] = [
  makeRanking({ teamId: 'alpha', teamName: 'Alpha', powerScore: 90, divisionName: 'Div A' }),
  makeRanking({ teamId: 'beta', teamName: 'Beta', powerScore: 70, divisionName: 'Div A' }),
  makeRanking({ teamId: 'gamma', teamName: 'Gamma', powerScore: 80, divisionName: 'Div B' }),
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RankingsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile = false;
    localStorage.clear();
  });

  describe('responsive rendering', () => {
    it('renders RankingsDesktopView when not mobile', () => {
      render(<RankingsTable rankings={[]} />);
      expect(screen.getByTestId('desktop-view')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-view')).not.toBeInTheDocument();
    });

    it('renders RankingsMobileView when mobile', () => {
      mockIsMobile = true;
      render(<RankingsTable rankings={[]} />);
      expect(screen.getByTestId('mobile-view')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-view')).not.toBeInTheDocument();
    });
  });

  describe('default sort state', () => {
    it('defaults to powerScore descending', () => {
      render(<RankingsTable rankings={[]} />);
      const view = screen.getByTestId('desktop-view');
      expect(view.dataset.sortField).toBe('powerScore');
      expect(view.dataset.sortDirection).toBe('desc');
    });
  });

  describe('sort behaviour', () => {
    it('clicking the same field toggles direction from desc to asc', async () => {
      render(<RankingsTable rankings={[]} />);

      await userEvent.click(screen.getByTestId('sort-powerScore'));

      const view = screen.getByTestId('desktop-view');
      expect(view.dataset.sortField).toBe('powerScore');
      expect(view.dataset.sortDirection).toBe('asc');
    });

    it('clicking the same field twice returns to desc', async () => {
      render(<RankingsTable rankings={[]} />);

      await userEvent.click(screen.getByTestId('sort-powerScore'));
      await userEvent.click(screen.getByTestId('sort-powerScore'));

      expect(screen.getByTestId('desktop-view').dataset.sortDirection).toBe('desc');
    });

    it('clicking a different field resets direction to desc', async () => {
      render(<RankingsTable rankings={[]} />);

      // First toggle powerScore to asc
      await userEvent.click(screen.getByTestId('sort-powerScore'));
      // Then switch to a different field
      await userEvent.click(screen.getByTestId('sort-wins'));

      const view = screen.getByTestId('desktop-view');
      expect(view.dataset.sortField).toBe('wins');
      expect(view.dataset.sortDirection).toBe('desc');
    });

    it('persists sort options to localStorage', async () => {
      render(<RankingsTable rankings={[]} />);

      await userEvent.click(screen.getByTestId('sort-wins'));

      const stored = JSON.parse(localStorage.getItem('rankingsSortOptions') ?? '{}');
      expect(stored).toEqual({ field: 'wins', direction: 'desc' });
    });

    it('persists toggled direction to localStorage', async () => {
      render(<RankingsTable rankings={[]} />);

      await userEvent.click(screen.getByTestId('sort-powerScore'));

      const stored = JSON.parse(localStorage.getItem('rankingsSortOptions') ?? '{}');
      expect(stored).toEqual({ field: 'powerScore', direction: 'asc' });
    });
  });

  describe('division rank calculation', () => {
    it('assigns rank 1 to the highest-power-score team within a division', () => {
      render(<RankingsTable rankings={divisionRankings} />);

      // alpha (score 90) should be rank 1 in Div A
      expect(screen.getByTestId('div-rank-alpha').textContent).toBe('1');
      // beta (score 70) should be rank 2 in Div A
      expect(screen.getByTestId('div-rank-beta').textContent).toBe('2');
    });

    it('assigns independent ranks to teams in different divisions', () => {
      render(<RankingsTable rankings={divisionRankings} />);

      // gamma is the only team in Div B — should be rank 1
      expect(screen.getByTestId('div-rank-gamma').textContent).toBe('1');
    });

    it('does not give a division rank to teams without a divisionName', () => {
      const rankings = [
        makeRanking({ teamId: 'nodiv', teamName: 'No Division', divisionName: null }),
      ];
      render(<RankingsTable rankings={rankings} />);

      expect(screen.getByTestId('div-rank-nodiv').textContent).toBe('');
    });
  });

  describe('expand toggle', () => {
    it('sets expandedTeam when a team row is expanded', async () => {
      render(<RankingsTable rankings={[makeRanking({ teamId: 'team-x' })]} />);

      await userEvent.click(screen.getByTestId('expand-team-x'));

      expect(screen.getByTestId('desktop-view').dataset.expandedTeam).toBe('team-x');
    });

    it('collapses by clicking the same expanded team again', async () => {
      render(<RankingsTable rankings={[makeRanking({ teamId: 'team-x' })]} />);

      await userEvent.click(screen.getByTestId('expand-team-x'));
      await userEvent.click(screen.getByTestId('expand-team-x'));

      expect(screen.getByTestId('desktop-view').dataset.expandedTeam).toBe('');
    });
  });
});
