import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

let mockIsMobile = false;

vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

vi.mock('@/components/stats/career/CareerRankingsDesktopView', () => ({
  default: ({ sortOptions, onSortChange, rankings }: any) => (
    <div
      data-testid="career-desktop-view"
      data-sort-field={sortOptions.field}
      data-sort-direction={sortOptions.direction}
    >
      <button data-testid="sort-careerPowerScore" onClick={() => onSortChange('careerPowerScore')}>
        Sort careerPowerScore
      </button>
      <button data-testid="sort-careerMatchWins" onClick={() => onSortChange('careerMatchWins')}>
        Sort careerMatchWins
      </button>
      {rankings.map((r: any) => (
        <div
          key={r.teamId}
          data-testid={`career-row-${r.teamId}`}
          data-power-score={r.careerPowerScore}
        />
      ))}
    </div>
  ),
}));

vi.mock('@/components/stats/career/CareerRankingsMobileView', () => ({
  default: ({ sortOptions, onSortChange }: any) => (
    <div
      data-testid="career-mobile-view"
      data-sort-field={sortOptions.field}
      data-sort-direction={sortOptions.direction}
    >
      <button
        data-testid="mobile-sort-careerPowerScore"
        onClick={() => onSortChange('careerPowerScore')}
      >
        Sort
      </button>
    </div>
  ),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import CareerRankingsTable from '../CareerRankingsTable';
import { CareerRanking } from '@/types/career';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeCareerRanking = (overrides: Partial<CareerRanking> = {}): CareerRanking => ({
  teamId: 'team-1',
  teamName: 'Team One',
  careerMatchWins: 10,
  careerMatchLosses: 5,
  careerWinPercentage: 0.667,
  careerGameWins: 25,
  careerGameLosses: 12,
  careerGameWinPercentage: 0.676,
  careerPlayoffWins: 3,
  careerPlayoffLosses: 1,
  careerPlayoffWinPercentage: 0.75,
  championships: 1,
  runnerUps: 0,
  careerSweepRate: 0.3,
  careerClutchWinPct: 0.6,
  careerClutchGame3s: 5,
  careerPowerScore: 80,
  careerSos: 0.55,
  playoffFinishes: 2,
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CareerRankingsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile = false;
  });

  describe('responsive rendering', () => {
    it('renders CareerRankingsDesktopView when not mobile', () => {
      render(<CareerRankingsTable rankings={[]} />);
      expect(screen.getByTestId('career-desktop-view')).toBeInTheDocument();
      expect(screen.queryByTestId('career-mobile-view')).not.toBeInTheDocument();
    });

    it('renders CareerRankingsMobileView when mobile', () => {
      mockIsMobile = true;
      render(<CareerRankingsTable rankings={[]} />);
      expect(screen.getByTestId('career-mobile-view')).toBeInTheDocument();
      expect(screen.queryByTestId('career-desktop-view')).not.toBeInTheDocument();
    });
  });

  describe('default sort state', () => {
    it('defaults to careerPowerScore descending', () => {
      render(<CareerRankingsTable rankings={[]} />);
      const view = screen.getByTestId('career-desktop-view');
      expect(view.dataset.sortField).toBe('careerPowerScore');
      expect(view.dataset.sortDirection).toBe('desc');
    });
  });

  describe('sort behaviour', () => {
    it('clicking the same field toggles from desc to asc', async () => {
      render(<CareerRankingsTable rankings={[]} />);

      await userEvent.click(screen.getByTestId('sort-careerPowerScore'));

      const view = screen.getByTestId('career-desktop-view');
      expect(view.dataset.sortField).toBe('careerPowerScore');
      expect(view.dataset.sortDirection).toBe('asc');
    });

    it('clicking the same field twice returns to desc', async () => {
      render(<CareerRankingsTable rankings={[]} />);

      await userEvent.click(screen.getByTestId('sort-careerPowerScore'));
      await userEvent.click(screen.getByTestId('sort-careerPowerScore'));

      expect(screen.getByTestId('career-desktop-view').dataset.sortDirection).toBe('desc');
    });

    it('clicking a different field resets direction to desc', async () => {
      render(<CareerRankingsTable rankings={[]} />);

      // Toggle careerPowerScore to asc
      await userEvent.click(screen.getByTestId('sort-careerPowerScore'));
      // Switch to a different field
      await userEvent.click(screen.getByTestId('sort-careerMatchWins'));

      const view = screen.getByTestId('career-desktop-view');
      expect(view.dataset.sortField).toBe('careerMatchWins');
      expect(view.dataset.sortDirection).toBe('desc');
    });
  });

  describe('sorted rankings passed to view', () => {
    it('passes rankings sorted desc by careerPowerScore by default', () => {
      const rankings = [
        makeCareerRanking({ teamId: 'low', careerPowerScore: 40 }),
        makeCareerRanking({ teamId: 'high', careerPowerScore: 90 }),
        makeCareerRanking({ teamId: 'mid', careerPowerScore: 65 }),
      ];

      render(<CareerRankingsTable rankings={rankings} />);

      const rows = screen.getAllByTestId(/^career-row-/);
      // High score (90) should be first
      expect(rows[0].dataset.powerScore).toBe('90');
      expect(rows[1].dataset.powerScore).toBe('65');
      expect(rows[2].dataset.powerScore).toBe('40');
    });

    it('reverses sort order when field toggled to asc', async () => {
      const rankings = [
        makeCareerRanking({ teamId: 'low', careerPowerScore: 40 }),
        makeCareerRanking({ teamId: 'high', careerPowerScore: 90 }),
      ];

      render(<CareerRankingsTable rankings={rankings} />);

      await userEvent.click(screen.getByTestId('sort-careerPowerScore'));

      const rows = screen.getAllByTestId(/^career-row-/);
      // Ascending: low (40) first
      expect(rows[0].dataset.powerScore).toBe('40');
      expect(rows[1].dataset.powerScore).toBe('90');
    });
  });
});
