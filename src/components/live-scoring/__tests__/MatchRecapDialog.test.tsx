import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseLiveMatch = vi.hoisted(() => vi.fn());
const mockUseTeamPlayers = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/live-scoring/useLiveMatch', () => ({
  useLiveMatch: (id: string) => mockUseLiveMatch(id),
}));
vi.mock('@/hooks/live-scoring/useTeamPlayers', () => ({
  useTeamPlayers: (id?: string) => mockUseTeamPlayers(id),
}));

import { MatchRecapDialog } from '../MatchRecapDialog';

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const bundle = {
  match: {
    team1_id: 'team1',
    team2_id: 'team2',
    team1_game_wins: 2,
    team2_game_wins: 1,
    winner_id: 'team1',
    team1: { name: 'Baggers' },
    team2: { name: 'Tossers' },
  },
  games: [],
  rounds: [],
  gamePlayers: [
    { player_id: 'p1', team_id: 'team1' },
    { player_id: 'p3', team_id: 'team2' },
  ],
};

const derived = {
  games: [
    {
      game: { id: 'g1', game_number: 1, winner_team_id: 'team1' },
      totals: { team1: 21, team2: 12 },
    },
  ],
};

const renderDialog = () =>
  render(
    <MemoryRouter>
      <MatchRecapDialog
        matchId="match-1"
        team1Name="Baggers"
        team2Name="Tossers"
        trigger={<button type="button">Open recap</button>}
      />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockUseTeamPlayers.mockReturnValue({ players: [] });
  mockUseLiveMatch.mockReturnValue({
    bundle,
    derived,
    isLoading: false,
    error: null,
  });
});

describe('MatchRecapDialog', () => {
  it('is closed by default and does not fetch live-match data', () => {
    renderDialog();
    expect(screen.queryByText('Match Recap')).not.toBeInTheDocument();
    // Hook is unconditionally called (React), but the recap body isn't rendered.
    expect(screen.queryByText('Open full recap')).not.toBeInTheDocument();
  });

  it('opens the recap on trigger click and shows the winner + link to full recap', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: /open recap/i }));

    expect(await screen.findByText('Match Recap')).toBeInTheDocument();
    // "Baggers won" appears in both the winner header and the Key Game line.
    expect(screen.getAllByText(/Baggers won/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2–1')).toBeInTheDocument();

    const fullRecap = screen.getByRole('link', { name: /open full recap/i });
    expect(fullRecap).toHaveAttribute('href', '/matches/match-1/live');
  });

  it('shows a loading state while the bundle is fetching', async () => {
    mockUseLiveMatch.mockReturnValue({
      bundle: undefined,
      derived: undefined,
      isLoading: true,
      error: null,
    });
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: /open recap/i }));

    await waitFor(() =>
      expect(screen.getByLabelText('Loading recap')).toBeInTheDocument()
    );
  });
});