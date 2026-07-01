import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match, Team } from '@/types';

const mockForm = vi.hoisted(() => vi.fn());

// Isolate the dialog: replace the real form with a lightweight sentinel that
// exposes its props and lets us trigger the onCancel/onSubmit passthrough.
vi.mock('@/components/schedule/MatchFormRHF', () => ({
  default: (props: {
    match?: Match;
    teams: Team[];
    onCancel: () => void;
    onSubmit: (match: Omit<Match, 'id'>) => void;
  }) => {
    mockForm(props);
    return (
      <div data-testid="match-form-rhf">
        <span>match:{props.match ? props.match.id : 'none'}</span>
        <span>teams:{props.teams.length}</span>
        <button type="button" onClick={() => props.onCancel()}>
          mock-cancel
        </button>
        <button
          type="button"
          onClick={() => props.onSubmit({ team1Id: 'a', team2Id: 'b' } as Omit<Match, 'id'>)}
        >
          mock-submit
        </button>
      </div>
    );
  },
}));

import MatchFormDialog from '../MatchFormDialog';

const teams: Team[] = [
  { id: 'team-a', name: 'Alpha' },
  { id: 'team-b', name: 'Beta' },
];

const existingMatch: Match = {
  id: 'match-99',
  team1Id: 'team-a',
  team2Id: 'team-b',
};

describe('MatchFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading skeleton and not the form while teams are loading', () => {
    render(
      <MatchFormDialog isOpen onClose={vi.fn()} teams={teams} onSubmit={vi.fn()} isLoadingTeams />
    );

    // The dialog chrome (title) is present but the form is not.
    expect(screen.getByText('Create New Match')).toBeInTheDocument();
    expect(screen.queryByTestId('match-form-rhf')).not.toBeInTheDocument();
    expect(mockForm).not.toHaveBeenCalled();
  });

  it('renders the form (with teams) once loading completes', () => {
    render(
      <MatchFormDialog
        isOpen
        onClose={vi.fn()}
        teams={teams}
        onSubmit={vi.fn()}
        isLoadingTeams={false}
      />
    );

    expect(screen.getByTestId('match-form-rhf')).toBeInTheDocument();
    expect(screen.getByText('teams:2')).toBeInTheDocument();
    expect(mockForm).toHaveBeenCalledTimes(1);
  });

  it('titles the dialog based on whether an existing match is provided', () => {
    const { rerender } = render(
      <MatchFormDialog isOpen onClose={vi.fn()} teams={teams} onSubmit={vi.fn()} />
    );
    expect(screen.getByText('Create New Match')).toBeInTheDocument();
    expect(screen.queryByText('Edit Match')).not.toBeInTheDocument();
    expect(screen.getByText('match:none')).toBeInTheDocument();

    rerender(
      <MatchFormDialog
        isOpen
        onClose={vi.fn()}
        teams={teams}
        onSubmit={vi.fn()}
        match={existingMatch}
      />
    );
    expect(screen.getByText('Edit Match')).toBeInTheDocument();
    expect(screen.queryByText('Create New Match')).not.toBeInTheDocument();
    expect(screen.getByText('match:match-99')).toBeInTheDocument();
  });

  it('passes onClose through to the form onCancel and forwards onSubmit', () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(
      <MatchFormDialog
        isOpen
        onClose={onClose}
        teams={teams}
        onSubmit={onSubmit}
        isLoadingTeams={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'mock-cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'mock-submit' }));
    expect(onSubmit).toHaveBeenCalledWith({ team1Id: 'a', team2Id: 'b' });
  });
});
