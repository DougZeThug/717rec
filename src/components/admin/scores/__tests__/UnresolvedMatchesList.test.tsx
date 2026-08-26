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
});
