import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LiveScoringNotEnabledError } from '@/types/errors';

const mockUseTeamPlayerSeasonStats = vi.fn();

vi.mock('@/hooks/live-scoring/useTeamPlayerSeasonStats', () => ({
  useTeamPlayerSeasonStats: (teamId: string | undefined) => mockUseTeamPlayerSeasonStats(teamId),
}));

import TeamPlayerStatsSection from '../TeamPlayerStatsSection';

const statRow = (overrides: Record<string, unknown> = {}) => ({
  season_id: 'season-1',
  player_id: 'p1',
  team_id: 'team-1',
  display_name: 'Doug',
  matches_with_rounds: 3,
  rounds_thrown: 20,
  rounds_won: 12,
  points_for: 145,
  points_against: 90,
  net_points_won: 40,
  bags_in: 30,
  bags_on: 25,
  bags_off: 25,
  four_baggers: 2,
  game_wins: 5,
  game_losses: 2,
  match_wins: 2,
  match_losses: 1,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TeamPlayerStatsSection', () => {
  it('renders PPR and DPR computed from raw counters', async () => {
    mockUseTeamPlayerSeasonStats.mockReturnValue({
      stats: [statRow()],
      isLoading: false,
      isNotEnabled: false,
      error: null,
    });

    render(<TeamPlayerStatsSection teamId="team-1" />, { wrapper: MemoryRouter });

    // The section is collapsed by default — open it to see the table.
    await userEvent.click(screen.getByText('Player Stats'));

    expect(screen.getByText('Doug')).toBeInTheDocument();
    expect(screen.getByText('7.25')).toBeInTheDocument(); // 145 / 20
    expect(screen.getByText('2.75')).toBeInTheDocument(); // (145 - 90) / 20
    expect(screen.getByText('5–2')).toBeInTheDocument();
  });

  it('shows Hole%, Board% and Off% from the bag counters', async () => {
    // 30 in, 25 on, 25 off of 80 bags -> 38% / 31% / 31%.
    mockUseTeamPlayerSeasonStats.mockReturnValue({
      stats: [statRow()],
      isLoading: false,
      isNotEnabled: false,
      error: null,
    });

    render(<TeamPlayerStatsSection teamId="team-1" />, { wrapper: MemoryRouter });
    await userEvent.click(screen.getByText('Player Stats'));

    expect(screen.getByText('Hole%')).toBeInTheDocument();
    expect(screen.getByText('38%')).toBeInTheDocument();
    expect(screen.getAllByText('31%')).toHaveLength(2); // Board% and Off%
  });

  it('renders dashes without crashing when bag fields are null', async () => {
    mockUseTeamPlayerSeasonStats.mockReturnValue({
      stats: [statRow({ bags_in: null, bags_on: null, bags_off: null })],
      isLoading: false,
      isNotEnabled: false,
      error: null,
    });

    render(<TeamPlayerStatsSection teamId="team-1" />, { wrapper: MemoryRouter });
    await userEvent.click(screen.getByText('Player Stats'));

    expect(screen.getByText('Doug')).toBeInTheDocument();
    // Hole%, Board% and Off% all render as unknown dashes.
    expect(screen.getAllByText('–').length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('renders nothing when there is no live-scoring data yet', () => {
    mockUseTeamPlayerSeasonStats.mockReturnValue({
      stats: [],
      isLoading: false,
      isNotEnabled: false,
      error: null,
    });

    const { container } = render(<TeamPlayerStatsSection teamId="team-1" />, {
      wrapper: MemoryRouter,
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when live scoring is not enabled', () => {
    mockUseTeamPlayerSeasonStats.mockReturnValue({
      stats: [],
      isLoading: false,
      isNotEnabled: true,
      error: new LiveScoringNotEnabledError(),
    });

    const { container } = render(<TeamPlayerStatsSection teamId="team-1" />, {
      wrapper: MemoryRouter,
    });
    expect(container).toBeEmptyDOMElement();
  });
});
