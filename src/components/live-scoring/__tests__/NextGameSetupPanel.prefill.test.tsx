import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { NextGameSetupPanel } from '../NextGameSetupPanel';

beforeAll(() => {
  // Radix pointer capture is not implemented in jsdom.
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const NAMES: Record<string, [string, string]> = {
  'team-1': ['Doug', 'Bill'],
  'team-2': ['Sara', 'Anne'],
};

const roster = (teamId: string) => {
  const [first, second] = NAMES[teamId];
  const base = { team_id: teamId, profile_id: null, is_active: true, created_at: '' };
  return [
    { ...base, id: `${teamId}-p1`, display_name: first },
    { ...base, id: `${teamId}-p2`, display_name: second },
  ];
};

/** The shape `useTeamPlayers` returns, with the loading state under test. */
const teamPlayers = (teamId: string, isLoading: boolean) => ({
  players: isLoading ? [] : roster(teamId),
  isLoading,
  error: null,
  addPlayer: { mutate: vi.fn(), isPending: false },
});

const previousGame = {
  game: { id: 'game-1', game_number: 1 },
  players: {
    team1: [{ player_id: 'team-1-p1' }, { player_id: 'team-1-p2' }],
    team2: [{ player_id: 'team-2-p1' }, { player_id: 'team-2-p2' }],
  },
};

const renderPanel = (isLoading: boolean) =>
  render(
    <NextGameSetupPanel
      nextGameNumber={2}
      team1Name="Alpha"
      team2Name="Beta"
      team1Id="team-1"
      team2Id="team-2"
      team1Players={teamPlayers('team-1', isLoading) as never}
      team2Players={teamPlayers('team-2', isLoading) as never}
      previousGame={previousGame as never}
      rounds={[]}
      playerNames={{}}
      canScore
      startGame={{ mutate: vi.fn(), isPending: false } as never}
      reopenGame={{ mutate: vi.fn(), isPending: false } as never}
    />
  );

describe('NextGameSetupPanel prefill', () => {
  it('prefills the previous game players when the rosters are already loaded', () => {
    renderPanel(false);
    expect(screen.getByRole('button', { name: 'Doug & Bill' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sara & Anne' })).toBeInTheDocument();
  });

  it('waits for the rosters instead of mounting the setup panel with an empty one', () => {
    // The race this guards: on a cold cache the panel used to mount while the
    // roster query was still in flight, seed its selection from an empty
    // roster, and never re-seed once the roster arrived — so the scorer had to
    // pick the pair who had just played all over again.
    const { rerender } = renderPanel(true);

    expect(screen.queryByText(/game 2 setup/i)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(
      <NextGameSetupPanel
        nextGameNumber={2}
        team1Name="Alpha"
        team2Name="Beta"
        team1Id="team-1"
        team2Id="team-2"
        team1Players={teamPlayers('team-1', false) as never}
        team2Players={teamPlayers('team-2', false) as never}
        previousGame={previousGame as never}
        rounds={[]}
        playerNames={{}}
        canScore
        startGame={{ mutate: vi.fn(), isPending: false } as never}
        reopenGame={{ mutate: vi.fn(), isPending: false } as never}
      />
    );

    expect(screen.getByRole('button', { name: 'Doug & Bill' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sara & Anne' })).toBeInTheDocument();
  });
});
