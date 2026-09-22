import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Link, MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTeamsQuery } from '@/hooks/teams';
import { type TeamComparisonSide, useTeamComparison } from '@/hooks/useTeamComparison';
import Compare from '@/pages/Compare';
import { openRadixTrigger } from '@/test/radix';
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
  headToHeadError: false,
  isLoading: false,
};

/** Reports the live URL so a test can prove the incoming link was not rewritten. */
const LocationProbe: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const compareTree = (url: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return (
    <MemoryRouter initialEntries={[url]}>
      <QueryClientProvider client={queryClient}>
        <Compare />
        <LocationProbe />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

const renderCompare = (url: string) => render(compareTree(url));

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

  it('shows a retryable error state when the teams fetch fails', async () => {
    const refetch = vi.fn();
    vi.mocked(useTeamsQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
      refetch,
    } as unknown as ReturnType<typeof useTeamsQuery>);

    renderCompare('/compare');

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/couldn't load the teams/i)).toBeInTheDocument();
    // The selector/empty prompts should not render while erroring.
    expect(screen.queryByText('Select Teams to Compare')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
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
      headToHeadError: false,
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
      headToHeadError: false,
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
      headToHeadError: false,
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

    const team1Trigger = screen.getByRole('combobox', { name: 'Team 1' });
    await openRadixTrigger(team1Trigger);

    const option = await screen.findByRole('option', { name: /Alpha Aces/ });
    await user.click(option);

    await waitFor(() => {
      expect(within(team1Trigger).getByText('Alpha Aces')).toBeInTheDocument();
    });
  });

  // UX audit CP-01: the teams query resolves after mount, so on the first render
  // there is nothing selected yet. The URL-sync effect used to run anyway and
  // replace ?team1=&team2= with an empty query string, wiping the ids before the
  // init effect could read them. A shared link then opened two empty selects.
  describe('deep links when teams arrive after mount', () => {
    const loadingTeams = {
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useTeamsQuery>;
    const loadedTeams = {
      data: [TEAM_A, TEAM_B],
      isLoading: false,
    } as ReturnType<typeof useTeamsQuery>;

    it('keeps both ids in the URL while the teams are still loading', async () => {
      vi.mocked(useTeamsQuery).mockReturnValue(loadingTeams);

      const { rerender } = renderCompare('/compare?team1=team-a&team2=team-b');

      // Nothing may be written to the URL before the ids have been applied.
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/compare?team1=team-a&team2=team-b'
      );

      // Teams arrive.
      vi.mocked(useTeamsQuery).mockReturnValue(loadedTeams);
      vi.mocked(useTeamComparison).mockReturnValue({
        team1: buildSide('team-a', 'Alpha Aces'),
        team2: buildSide('team-b', 'Bravo Bombers'),
        headToHead: null,
        headToHeadError: false,
        isLoading: false,
      });
      rerender(compareTree('/compare?team1=team-a&team2=team-b'));

      await waitFor(() => {
        expect(screen.getByTestId('location')).toHaveTextContent(
          '/compare?team1=team-a&team2=team-b'
        );
      });
    });

    it('selects both teams from the URL once they load', async () => {
      vi.mocked(useTeamsQuery).mockReturnValue(loadedTeams);

      renderCompare('/compare?team1=team-a&team2=team-b');

      const team1Trigger = screen.getByRole('combobox', { name: 'Team 1' });
      const team2Trigger = screen.getByRole('combobox', { name: 'Team 2' });
      await waitFor(() => {
        expect(within(team1Trigger).getByText('Alpha Aces')).toBeInTheDocument();
      });
      expect(within(team2Trigger).getByText('Bravo Bombers')).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/compare?team1=team-a&team2=team-b'
      );
    });

    it('still writes the URL for a selection made in the UI', async () => {
      const user = userEvent.setup();
      vi.mocked(useTeamsQuery).mockReturnValue(loadedTeams);

      renderCompare('/compare');

      const team1Trigger = screen.getByRole('combobox', { name: 'Team 1' });
      await openRadixTrigger(team1Trigger);
      await user.click(await screen.findByRole('option', { name: /Alpha Aces/ }));

      await waitFor(() => {
        expect(screen.getByTestId('location')).toHaveTextContent('/compare?team1=team-a');
      });
    });
  });

  // The URL->state sync used to be additive only: a missing id meant "no
  // change", so it could select a team but never clear one. The state->URL sync
  // then wrote the still-selected team straight back, undoing the edit.
  describe('taking a team out of the address', () => {
    const loadedTeams = {
      data: [TEAM_A, TEAM_B],
      isLoading: false,
    } as ReturnType<typeof useTeamsQuery>;

    /** Same-route navigation to a /compare URL carrying fewer teams. */
    const compareTreeWithNav = (url: string, to: string) =>
      render(
        <MemoryRouter initialEntries={[url]}>
          <QueryClientProvider
            client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
          >
            <Compare />
            <Link to={to}>Narrow the address</Link>
            <LocationProbe />
          </QueryClientProvider>
        </MemoryRouter>
      );

    it('clears the second team and leaves it out of the address', async () => {
      const user = userEvent.setup();
      vi.mocked(useTeamsQuery).mockReturnValue(loadedTeams);

      compareTreeWithNav('/compare?team1=team-a&team2=team-b', '/compare?team1=team-a');

      const team2Trigger = screen.getByRole('combobox', { name: 'Team 2' });
      await waitFor(() => {
        expect(within(team2Trigger).getByText('Bravo Bombers')).toBeInTheDocument();
      });

      // This is the ⌘K palette's "Compare Teams" shape too: same route, fewer
      // teams than are currently selected.
      await user.click(screen.getByRole('link', { name: 'Narrow the address' }));

      await waitFor(() => {
        expect(within(team2Trigger).queryByText('Bravo Bombers')).not.toBeInTheDocument();
      });
      expect(screen.getByTestId('location')).toHaveTextContent('/compare?team1=team-a');
    });

    it('empties both sides when the address names no team at all', async () => {
      const user = userEvent.setup();
      vi.mocked(useTeamsQuery).mockReturnValue(loadedTeams);

      compareTreeWithNav('/compare?team1=team-a&team2=team-b', '/compare');

      const team1Trigger = screen.getByRole('combobox', { name: 'Team 1' });
      await waitFor(() => {
        expect(within(team1Trigger).getByText('Alpha Aces')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('link', { name: 'Narrow the address' }));

      await waitFor(() => {
        expect(within(team1Trigger).queryByText('Alpha Aces')).not.toBeInTheDocument();
      });
      expect(screen.getByTestId('location')).toHaveTextContent('/compare');
    });
  });

  it('refuses an address that names the same team on both sides', async () => {
    vi.mocked(useTeamsQuery).mockReturnValue({
      data: [TEAM_A, TEAM_B],
      isLoading: false,
    } as ReturnType<typeof useTeamsQuery>);

    // A team is never its own opponent, so the head-to-head read comes back
    // empty and the page would otherwise call that a "first meeting".
    renderCompare('/compare?team1=team-a&team2=team-a');

    const team1Trigger = screen.getByRole('combobox', { name: 'Team 1' });
    const team2Trigger = screen.getByRole('combobox', { name: 'Team 2' });
    await waitFor(() => {
      expect(within(team1Trigger).getByText('Alpha Aces')).toBeInTheDocument();
    });

    expect(within(team2Trigger).queryByText('Alpha Aces')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/compare?team1=team-a');
  });

  it('swaps which team is on which side, and rewrites the URL to match', async () => {
    const user = userEvent.setup();
    vi.mocked(useTeamsQuery).mockReturnValue({
      data: [TEAM_A, TEAM_B],
      isLoading: false,
    } as ReturnType<typeof useTeamsQuery>);
    vi.mocked(useTeamComparison).mockReturnValue({
      team1: buildSide('team-a', 'Alpha Aces'),
      team2: buildSide('team-b', 'Bravo Bombers'),
      headToHead: null,
      headToHeadError: false,
      isLoading: false,
    });

    renderCompare('/compare?team1=team-a&team2=team-b');

    const team1Trigger = screen.getByRole('combobox', { name: 'Team 1' });
    const team2Trigger = screen.getByRole('combobox', { name: 'Team 2' });
    await waitFor(() => {
      expect(within(team1Trigger).getByText('Alpha Aces')).toBeInTheDocument();
    });

    const swapButton = screen.getByRole('button', { name: 'Swap teams' });
    await user.click(swapButton);

    await waitFor(() => {
      expect(within(team1Trigger).getByText('Bravo Bombers')).toBeInTheDocument();
    });
    expect(within(team2Trigger).getByText('Alpha Aces')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/compare?team1=team-b&team2=team-a');
  });
});
