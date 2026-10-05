import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TeamTotals from '../TeamTotals';

const { mockUseTeamTotals } = vi.hoisted(() => ({ mockUseTeamTotals: vi.fn() }));

vi.mock('@/hooks/useTeamTotals', () => ({ useTeamTotals: () => mockUseTeamTotals() }));
vi.mock('@/hooks/useLeaguePercentiles', () => ({
  useLeaguePercentiles: () => ({ getTeamPercentiles: () => null }),
}));

type Record = { wins: number; losses: number };

const totalsWith = (
  competitive: Record,
  intermediate: Record = { wins: 0, losses: 0 },
  recreational: Record = { wins: 0, losses: 0 }
) => ({
  isLoading: false,
  totals: {
    career_match_wins: 0,
    career_match_losses: 0,
    career_game_wins: 0,
    career_game_losses: 0,
    career_playoff_wins: 0,
    career_playoff_losses: 0,
    championships: 0,
    runner_ups: 0,
    career_power_score: 0,
    career_sweep_rate: 0,
    career_sweeps: 0,
    career_clutch_game3s: 0,
    career_clutch_wins: 0,
    career_clutch_win_pct: 0,
    career_sos: 0,
    division_records: { competitive, intermediate, recreational },
    playoff_finishes: [],
  },
});

describe('TeamTotals division win percentage colour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Each band reads on both themes: a darker shade for light, a lighter one for dark.
  it.each([
    [{ wins: 7, losses: 3 }, '70%', 'text-emerald-700', 'dark:text-emerald-400'],
    [{ wins: 5, losses: 5 }, '50%', 'text-blue-600', 'dark:text-blue-400'],
    [{ wins: 4, losses: 6 }, '40%', 'text-yellow-700', 'dark:text-yellow-400'],
    [{ wins: 1, losses: 9 }, '10%', 'text-red-600', 'dark:text-red-400'],
  ])('colours a %o record as %s: %s on light, %s on dark', (record, pct, light, dark) => {
    mockUseTeamTotals.mockReturnValue(totalsWith(record));
    render(<TeamTotals teamId="team-1" standalone />);

    expect(screen.getByText(pct)).toHaveClass(light, dark);
  });
});

describe('TeamTotals loading and empty states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['on its own', true],
    ['inside its section', false],
  ])('shows placeholders while the totals load %s', (_label, standalone) => {
    mockUseTeamTotals.mockReturnValue({ isLoading: true, totals: null });
    const { container } = render(
      <MemoryRouter>
        <TeamTotals teamId="team-1" standalone={standalone} />
      </MemoryRouter>
    );

    // The section starts closed, so open it to see what it holds.
    if (!standalone) fireEvent.click(screen.getByRole('button', { name: /career statistics/i }));

    // Four placeholder blocks of two bars each, whichever way it is wrapped.
    expect(container.querySelectorAll('.h-4.w-20')).toHaveLength(4);
    expect(screen.queryByText('No career statistics available')).not.toBeInTheDocument();
  });

  it('says there are no career statistics when the team has none, on its own', () => {
    mockUseTeamTotals.mockReturnValue({ isLoading: false, totals: null });
    render(<TeamTotals teamId="team-1" standalone />);

    expect(screen.getByText('No career statistics available')).toBeInTheDocument();
  });
  it('says there are no career statistics inside its section too', () => {
    mockUseTeamTotals.mockReturnValue({ isLoading: false, totals: null });
    render(
      <MemoryRouter>
        <TeamTotals teamId="team-1" />
      </MemoryRouter>
    );

    // The section starts closed, so open it to read what it says.
    fireEvent.click(screen.getByRole('button', { name: /career statistics/i }));

    expect(screen.getByText('No career statistics available')).toBeInTheDocument();
  });
});
