import { render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TeamTotals from '../TeamTotals';

vi.mock('@/hooks/useTeamTotals', () => ({
  useTeamTotals: () => ({
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
      division_records: {
        competitive: { wins: 0, losses: 0 },
        intermediate: { wins: 0, losses: 0 },
        recreational: { wins: 0, losses: 0 },
      },
      playoff_finishes: [
        { rank: 2, season_name: 'Spring 2024', division_name: 'Competitive' },
        { rank: 2, season_name: 'Fall 2024', division_name: 'Competitive' },
      ],
    },
  }),
}));

vi.mock('@/hooks/useLeaguePercentiles', () => ({
  useLeaguePercentiles: () => ({ getTeamPercentiles: () => null }),
}));

describe('TeamTotals playoff finishes keys', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('does not warn about duplicate keys when finishes share division+rank across seasons', () => {
    const { getAllByText } = render(<TeamTotals teamId="team-1" standalone />);

    const duplicateKeyWarning = errorSpy.mock.calls.find((call: unknown[]) =>
      String(call[0] ?? '').includes('Encountered two children with the same key')
    );
    expect(duplicateKeyWarning).toBeUndefined();

    expect(getAllByText('(Competitive)')).toHaveLength(2);
  });
});
