import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Match, Team } from '@/types';

import UnresolvedMatchesList from '../UnresolvedMatchesList';

const match = {
  id: 'match-1',
  team1Id: 'team-1',
  team2Id: 'team-2',
  date: '2026-01-01T00:00:00Z',
  location: 'Lane 1',
  iscompleted: true,
  team1_game_wins: 1,
  team2_game_wins: 1,
} as Match;

const teams = {
  'team-1': { id: 'team-1', name: 'Owls' } as Team,
  'team-2': { id: 'team-2', name: 'Hawks' } as Team,
};

const renderList = (
  overrides: Partial<React.ComponentProps<typeof UnresolvedMatchesList>> = {}
) => {
  const props = {
    matches: [match],
    teams,
    onApproveWinner: vi.fn(),
    onMarkTie: vi.fn(),
    ...overrides,
  };
  render(<UnresolvedMatchesList {...props} />);
  return props;
};

describe('UnresolvedMatchesList', () => {
  it('shows the teams and the games each one won', () => {
    renderList();
    expect(screen.getByText('Owls vs Hawks')).toBeInTheDocument();
    expect(screen.getByText(/Games won: Owls 1 — Hawks 1/u)).toBeInTheDocument();
  });

  it('names team 1 as the winner', () => {
    const { onApproveWinner } = renderList();
    fireEvent.click(screen.getByRole('button', { name: /Owls won/i }));
    expect(onApproveWinner).toHaveBeenCalledWith(match, 1);
  });

  it('names team 2 as the winner', () => {
    const { onApproveWinner } = renderList();
    fireEvent.click(screen.getByRole('button', { name: /Hawks won/i }));
    expect(onApproveWinner).toHaveBeenCalledWith(match, 2);
  });

  it('records a tie with just the match id', () => {
    const { onMarkTie } = renderList();
    fireEvent.click(screen.getByRole('button', { name: /it was a tie/i }));
    expect(onMarkTie).toHaveBeenCalledWith('match-1');
  });

  it('falls back to generic names for an unknown team', () => {
    renderList({ teams: {} });
    expect(screen.getByText('Team 1 vs Team 2')).toBeInTheDocument();
  });

  it('renders nothing when there is nothing to resolve', () => {
    const { container } = render(
      <UnresolvedMatchesList
        matches={[]}
        teams={teams}
        onApproveWinner={vi.fn()}
        onMarkTie={vi.fn()}
      />
    );
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('disables every action while a write is in flight', () => {
    renderList({ disabled: true });
    screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
  });

  // One match being written must not stop the admin clearing the rest of the
  // queue, but its own three actions have to go: approving a winner and
  // confirming a tie for the same match are contradictory instructions.
  describe('while one match is being written', () => {
    const second = { ...match, id: 'match-2', team1Id: 'team-3', team2Id: 'team-4' } as Match;
    const moreTeams = {
      ...teams,
      'team-3': { id: 'team-3', name: 'Kites' } as Team,
      'team-4': { id: 'team-4', name: 'Terns' } as Team,
    };

    it('locks that match’s three actions', () => {
      renderList({
        matches: [match, second],
        teams: moreTeams,
        resolvingMatchIds: new Set(['match-1']),
      });

      expect(screen.getByRole('button', { name: /Owls won/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Hawks won/ })).toBeDisabled();
      expect(screen.getAllByRole('button', { name: /It was a tie/ })[0]).toBeDisabled();
    });

    it('leaves every other match pressable', () => {
      renderList({
        matches: [match, second],
        teams: moreTeams,
        resolvingMatchIds: new Set(['match-1']),
      });

      expect(screen.getByRole('button', { name: /Kites won/ })).toBeEnabled();
      expect(screen.getByRole('button', { name: /Terns won/ })).toBeEnabled();
      expect(screen.getAllByRole('button', { name: /It was a tie/ })[1]).toBeEnabled();
    });

    it('locks nothing when no write is in flight', () => {
      renderList({
        matches: [match, second],
        teams: moreTeams,
        resolvingMatchIds: new Set<string>(),
      });

      screen.getAllByRole('button').forEach((button) => expect(button).toBeEnabled());
    });

    // Two matches can be mid-write at once. A single id would unlock whichever
    // started first, which is the hole a review caught.
    it('locks every match that is mid-write, not just one', () => {
      renderList({
        matches: [match, second],
        teams: moreTeams,
        resolvingMatchIds: new Set(['match-1', 'match-2']),
      });

      screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
    });
  });
});
