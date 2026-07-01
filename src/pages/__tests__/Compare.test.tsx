import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTeamsQuery } from '@/hooks/teams';
import { type TeamComparisonSide, useTeamComparison } from '@/hooks/useTeamComparison';
import Compare from '@/pages/Compare';
import type { Team } from '@/types';

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/teams', () => ({ useTeamsQuery: vi.fn() }));
vi.mock('@/hooks/useTeamComparison', () => ({ useTeamComparison: vi.fn() }));

const TEAM_A: Team = { id: 'team-a', name: 'Alpha Aces', logoUrl: null };
const TEAM_B: Team = { id: 'team-b', name: 'Bravo Bombers', logoUrl: null };

const buildSide = (id: string, name: string): TeamComparisonSide => ({
  id,
  name,
  logoUrl: null,
  winPct: 60,
  gameWinPct: 55,
  percentiles: null,
  totals: {
    career_match_wins: 12,
    career_match_losses: 8,
    career_game_wins: 30,
    career_game_losses: 20,
    career_playoff_wins: 3,
    career_playoff_losses: 1,
    championships: 1,
    runner_ups: 2,
    career_power_score: 75.5,
    career_sweep_rate: 40,
    career_sweeps: 4,
    career_sos: 0.512,
    division_records: {
      competitive: { wins: 5, losses: 3 },
      intermediate: { wins: 4, losses: 2 },
      recreational: { wins: 3, losses: 3 },
    },
  },
});

const emptyComparison = {
  team1: null,
  team2: null,
  headToHead: null,
  isLoading: false,
};

const renderCompare = (url: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <MemoryRouter initialEntries={[url]}>
      <QueryClientProvider client={queryClient}>
        <Compare />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('Compare', () => {
  beforeEach(() => {
    vi.mocked(useTeamsQuery).mockReset();
    vi.mocked(useTeamComparison).mockReset();
    // Default: comparison hook returns nothing selected.
    vi.mocked(useTeamComparison).mockReturnValue(emptyComparison);
  });

  it('shows a loading message while teams are loading', () => {
    vi.mocked(useTeamsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useTeamsQuery>);

    renderCompare('/compare');

    expect(screen.getByText('Loading teams...')).toBeInTheDocument();
  });

  it('prompts to select teams when loaded with no URL params', () => {
    vi.mocked(useTeamsQuery).mockReturnValue({
      data: [TEAM_A, TEAM_B],
      isLoading: false,
    } as ReturnType<typeof useTeamsQuery>);

    renderCompare('/compare');

    expect(screen.getByText('Select Teams to Compare')).toBeInTheDocument();
    // Real selector should render with both placeholders.
    expect(screen.getByText('Select Team 1')).toBeInTheDocument();
    expect(screen.getByText('Select Team 2')).toBeInTheDocument();
  });

  it('prompts for the second team when only team1 is in the URL', async () => {
    vi.mocked(useTeamsQuery).mockReturnValue({
      data: [TEAM_A, TEAM_B],
      isLoading: false,
    } as ReturnType<typeof useTeamsQuery>);
    vi.mocked(useTeamComparison).mockReturnValue({
      team1: buildSide(TEAM_A.id, TEAM_A.name),
      team2: null,
      headToHead: null,
      isLoading: false,
    });

    renderCompare('/compare?team1=team-a');

    await waitFor(() => {
      expect(screen.getByText('Select the second team to start comparing')).toBeInTheDocument();
    });
  });

  it('shows a comparison loading message when both teams are selected and loading', async () => {
    vi.mocked(useTeamsQuery).mockReturnValue({
      data: [TEAM_A, TEAM_B],
      isLoading: false,
    } as ReturnType<typeof useTeamsQuery>);
    vi.mocked(useTeamComparison).mockReturnValue({
      team1: null,
      team2: null,
      headToHead: null,
      isLoading: true,
    });

    renderCompare('/compare?team1=team-a&team2=team-b');

    await waitFor(() => {
      expect(screen.getByText('Loading comparison...')).toBeInTheDocument();
    });
  });

  it('renders the real comparison view when both sides resolve', async () => {
    vi.mocked(useTeamsQuery).mockReturnValue({
      data: [TEAM_A, TEAM_B],
      isLoading: false,
    } as ReturnType<typeof useTeamsQuery>);
    vi.mocked(useTeamComparison).mockReturnValue({
      team1: buildSide(TEAM_A.id, TEAM_A.name),
      team2: buildSide(TEAM_B.id, TEAM_B.name),
      headToHead: {
        team1Wins: 2,
        team2Wins: 1,
        gameWins1: 5,
        gameWins2: 3,
        lastPlayed: null,
        isFirstMeeting: false,
      },
      isLoading: false,
    });

    renderCompare('/compare?team1=team-a&team2=team-b');

    await waitFor(() => {
      expect(screen.getByText('Career Statistics')).toBeInTheDocument();
    });
    // Both team names appear (selector trigger + comparison headers).
    expect(screen.getAllByText('Alpha Aces').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bravo Bombers').length).toBeGreaterThan(0);
    // A stat section from the real TeamComparisonView.
    expect(screen.getByText('Playoff Performance')).toBeInTheDocument();
  });

  it('reflects a team chosen from the Team 1 dropdown in the trigger', async () => {
    const user = userEvent.setup();
    vi.mocked(useTeamsQuery).mockReturnValue({
      data: [TEAM_A, TEAM_B],
      isLoading: false,
    } as ReturnType<typeof useTeamsQuery>);

    renderCompare('/compare');

    const [team1Trigger] = screen.getAllByRole('combobox');
    await user.click(team1Trigger);

    const option = await screen.findByRole('option', { name: /Alpha Aces/ });
    await user.click(option);

    await waitFor(() => {
      expect(within(team1Trigger).getByText('Alpha Aces')).toBeInTheDocument();
    });
  });
});
