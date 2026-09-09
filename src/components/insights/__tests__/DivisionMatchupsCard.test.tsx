import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DivisionMatchupRecord } from '@/hooks/useLeagueDivisionMatchups';

const mockUseLeagueDivisionMatchups = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useLeagueDivisionMatchups', () => ({
  useLeagueDivisionMatchups: () => mockUseLeagueDivisionMatchups(),
}));

import DivisionMatchupsCard from '../DivisionMatchupsCard';

const dataFixture: DivisionMatchupRecord[] = [
  { tierA: 'competitive', tierB: 'intermediate', winsA: 5, winsB: 3 },
  { tierA: 'intermediate', tierB: 'recreational', winsA: 0, winsB: 0 },
];

describe('DivisionMatchupsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeleton placeholders and no matchup rows while loading', () => {
    mockUseLeagueDivisionMatchups.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<DivisionMatchupsCard />);

    // Header always renders.
    expect(screen.getByText('Division Matchups')).toBeInTheDocument();

    // One skeleton per pair of different divisions.
    const skeletons = container.querySelectorAll('.h-8.w-full');
    expect(skeletons.length).toBe(3);

    // No tier labels / matchup content while loading.
    expect(screen.queryByText('Competitive')).not.toBeInTheDocument();
    expect(screen.queryByText('Intermediate')).not.toBeInTheDocument();
    expect(screen.queryByText('no matches')).not.toBeInTheDocument();
  });

  it('renders tier labels, win numbers, and the no-matches label only on zero-total rows', () => {
    mockUseLeagueDivisionMatchups.mockReturnValue({ data: dataFixture, isLoading: false });
    const { container } = render(<DivisionMatchupsCard />);

    // Row labels. Intermediate appears on both rows of the fixture.
    expect(screen.getByText('Competitive')).toBeInTheDocument();
    expect(screen.getAllByText('Intermediate')).toHaveLength(2);
    expect(screen.getByText('Recreational')).toBeInTheDocument();

    // Win numbers from the competitive-vs-intermediate row.
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // IN-01: the raw counts had no unit. 5 of 8 games is 63%.
    expect(screen.getByText('Competitive won 63%')).toBeInTheDocument();

    // "no matches" appears only once — on the zero-total row, which has no share.
    const noMatches = screen.getAllByText('no matches');
    expect(noMatches).toHaveLength(1);

    // Skeletons are gone once data is present.
    expect(container.querySelectorAll('.h-8.w-full').length).toBe(0);
  });

  it('does not show the no-matches label when a row has any wins', () => {
    mockUseLeagueDivisionMatchups.mockReturnValue({
      data: [{ tierA: 'competitive', tierB: 'intermediate', winsA: 7, winsB: 7 }],
      isLoading: false,
    });
    render(<DivisionMatchupsCard />);

    expect(screen.getAllByText('7')).toHaveLength(2);
    expect(screen.queryByText('no matches')).not.toBeInTheDocument();
    // An even split names the higher division, and reads 50%.
    expect(screen.getByText('Competitive won 50%')).toBeInTheDocument();
  });

  it('names the winning side when the lower division is ahead', () => {
    mockUseLeagueDivisionMatchups.mockReturnValue({
      data: [{ tierA: 'competitive', tierB: 'recreational', winsA: 1, winsB: 9 }],
      isLoading: false,
    });
    render(<DivisionMatchupsCard />);

    expect(screen.getByText('Recreational won 90%')).toBeInTheDocument();
  });
});
