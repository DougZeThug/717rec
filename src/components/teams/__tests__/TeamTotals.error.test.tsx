import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TeamTotals from '../TeamTotals';

const { mockUseTeamTotals } = vi.hoisted(() => ({ mockUseTeamTotals: vi.fn() }));

vi.mock('@/hooks/career/useTeamTotalsComputed', () => ({
  useTeamTotalsComputed: () => mockUseTeamTotals(),
}));
vi.mock('@/hooks/useLeaguePercentiles', () => ({
  useLeaguePercentiles: () => ({ getTeamPercentiles: () => null }),
}));

const failed = (refetch = vi.fn()) => ({
  totals: undefined,
  isLoading: false,
  error: new Error('read failed'),
  refetch,
});

const totalsOk = () => ({
  isLoading: false,
  totals: {
    career_match_wins: 3,
    career_match_losses: 1,
    career_game_wins: 7,
    career_game_losses: 3,
    career_playoff_wins: 0,
    career_playoff_losses: 0,
    championships: 0,
    runner_ups: 0,
    career_power_score: 50,
    career_sweep_rate: 0,
    career_sweeps: 0,
    career_clutch_game3s: 0,
    career_clutch_wins: 0,
    career_clutch_win_pct: 0,
    career_sos: 0.5,
    division_records: {
      competitive: { wins: 0, losses: 0 },
      intermediate: { wins: 0, losses: 0 },
      recreational: { wins: 0, losses: 0 },
    },
    playoff_finishes: [],
  },
});

describe('TeamTotals when the career read fails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('says the stats could not load, not that the team has no stats', () => {
    mockUseTeamTotals.mockReturnValue(failed());
    render(
      <MemoryRouter>
        <TeamTotals teamId="team-1" standalone />
      </MemoryRouter>
    );

    expect(screen.getByText("We couldn't load career statistics. Please try again.")).toBeVisible();
    expect(screen.queryByText('No career statistics available')).not.toBeInTheDocument();
    expect(screen.queryByText('Stats will appear after playing matches')).not.toBeInTheDocument();
  });

  it('retries the read when the player taps Retry', () => {
    const refetch = vi.fn();
    mockUseTeamTotals.mockReturnValue(failed(refetch));
    render(
      <MemoryRouter>
        <TeamTotals teamId="team-1" standalone />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the error inside the Career Statistics section on the team page', () => {
    mockUseTeamTotals.mockReturnValue(failed());
    render(
      <MemoryRouter>
        <TeamTotals teamId="team-1" />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Career Statistics'));

    expect(
      screen.getByText("We couldn't load career statistics. Please try again.")
    ).toBeInTheDocument();
    expect(screen.queryByText('No career statistics available')).not.toBeInTheDocument();
  });

  it('keeps showing the old totals when a refresh fails', () => {
    mockUseTeamTotals.mockReturnValue({
      ...totalsOk(),
      error: new Error('refresh failed'),
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <TeamTotals teamId="team-1" standalone />
      </MemoryRouter>
    );

    expect(screen.getByText('Career Record')).toBeInTheDocument();
    expect(screen.queryByText(/couldn't load career statistics/i)).not.toBeInTheDocument();
    expect(screen.queryByText('No career statistics available')).not.toBeInTheDocument();
  });

  it('keeps the quiet empty message when the read worked but there are no totals', () => {
    mockUseTeamTotals.mockReturnValue({
      totals: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <TeamTotals teamId="team-1" standalone />
      </MemoryRouter>
    );

    expect(screen.getByText('No career statistics available')).toBeInTheDocument();
    expect(screen.queryByText(/couldn't load career statistics/i)).not.toBeInTheDocument();
  });
});
