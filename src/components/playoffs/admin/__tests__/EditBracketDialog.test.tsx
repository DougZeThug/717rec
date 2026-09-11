import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import EditBracketDialog from '@/components/playoffs/admin/EditBracketDialog';
import type { PlayoffBracket } from '@/utils/playoffs/playoffTypes';

const mutate = vi.fn();
vi.mock('@/hooks/playoffs/useUpdateBracket', () => ({
  useUpdateBracket: () => ({ mutate, isPending: false }),
}));

vi.mock('@/hooks/useDivisions', () => ({
  useDivisions: () => ({
    divisions: [
      { id: 'd-1', name: 'Competitive' },
      { id: 'd-2', name: 'Recreational' },
    ],
  }),
}));

const bracket = {
  id: 'b-1',
  name: 'Summer Finals',
  divisionId: 'd-1',
  format: 'Single Elimination',
  state: 'pending',
} as unknown as PlayoffBracket;

const renderDialog = (overrides: Partial<PlayoffBracket> = {}) =>
  render(
    <EditBracketDialog
      open
      onOpenChange={vi.fn()}
      bracket={{ ...bracket, ...overrides } as PlayoffBracket}
    />
  );

describe('EditBracketDialog', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts from the bracket’s current name', () => {
    renderDialog();

    expect(screen.getByLabelText('Bracket name')).toHaveValue('Summer Finals');
  });

  it('saves a new name', async () => {
    const user = userEvent.setup();
    renderDialog();

    const input = screen.getByLabelText('Bracket name');
    await user.clear(input);
    await user.type(input, 'Summer Championship');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    // Only the title: the division was not touched, so it is not written.
    expect(mutate).toHaveBeenCalledWith({ title: 'Summer Championship' }, expect.anything());
  });

  it('will not save a blank name', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.clear(screen.getByLabelText('Bracket name'));

    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
    expect(screen.getByText('Enter a name for the bracket.')).toBeInTheDocument();
  });

  it('will not save when nothing has changed', () => {
    renderDialog();

    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  it('locks the division once the bracket has started, and says why', async () => {
    const user = userEvent.setup();
    renderDialog({ state: 'in_progress' } as Partial<PlayoffBracket>);

    expect(screen.getByLabelText('Division')).toBeDisabled();
    expect(screen.getByText(/cannot be moved to another division/i)).toBeInTheDocument();

    const input = screen.getByLabelText('Bracket name');
    await user.clear(input);
    await user.type(input, 'Renamed Mid-Season');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    // Only the title is sent — the division is left alone.
    expect(mutate).toHaveBeenCalledWith({ title: 'Renamed Mid-Season' }, expect.anything());
  });

  it('does not clear the division when only the name changes', async () => {
    const user = userEvent.setup();
    // A bracket whose division id never reached the component.
    renderDialog({ divisionId: undefined } as Partial<PlayoffBracket>);

    const input = screen.getByLabelText('Bracket name');
    await user.clear(input);
    await user.type(input, 'Renamed');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    // Only the title is sent. Sending division_id: null here would wipe the
    // bracket's division and drop it out of the grouped list.
    expect(mutate).toHaveBeenCalledWith({ title: 'Renamed' }, expect.anything());
  });

  it('locks the division once a match has been played, even while state is pending', async () => {
    const user = userEvent.setup();
    // Nothing in the app ever writes an in-progress state, so a bracket part
    // way through a tournament still reads as 'pending'.
    renderDialog({
      state: 'pending',
      matches: [{ id: 'm1', winnerId: 'team-1' }],
    } as unknown as Partial<PlayoffBracket>);

    expect(screen.getByLabelText('Division')).toBeDisabled();
    expect(screen.getByText(/cannot be moved to another division/i)).toBeInTheDocument();

    const input = screen.getByLabelText('Bracket name');
    await user.clear(input);
    await user.type(input, 'Renamed Mid-Tournament');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(mutate).toHaveBeenCalledWith({ title: 'Renamed Mid-Tournament' }, expect.anything());
  });

  it('leaves the division editable while no match has been played', () => {
    renderDialog({
      state: 'pending',
      matches: [{ id: 'm1', winnerId: null }],
    } as unknown as Partial<PlayoffBracket>);

    expect(screen.getByLabelText('Division')).not.toBeDisabled();
  });

  // A bracket whose team count is not a power of two is drawn with BYE matches,
  // and the bracket library writes the win for the team facing the BYE as it
  // draws them. That is not a game anybody played.
  it('leaves the division editable on a new bracket drawn with a BYE', async () => {
    const user = userEvent.setup();
    renderDialog({
      state: 'pending',
      matches: [
        // Team 1 against a BYE: a winner, no opponent, nothing played.
        {
          id: 'm1',
          team1Id: 'team-1',
          team2Id: null,
          winnerId: 'team-1',
          team1Score: null,
          team2Score: null,
          status: 'pending',
        },
        // A real first-round pairing, not yet played.
        {
          id: 'm2',
          team1Id: 'team-2',
          team2Id: 'team-3',
          winnerId: null,
          team1Score: null,
          team2Score: null,
          status: 'ready',
        },
      ],
    } as unknown as Partial<PlayoffBracket>);

    expect(screen.getByLabelText('Division')).not.toBeDisabled();

    await user.click(screen.getByLabelText('Division'));
    await user.click(await screen.findByRole('option', { name: 'Recreational' }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(mutate).toHaveBeenCalledWith(
      { title: 'Summer Finals', division_id: 'd-2' },
      expect.anything()
    );
  });

  // An admin can walk a one-sided match forward on an older bracket. That marks
  // the match played, so the bracket has started even though it scored 0.
  it('locks the division once a BYE match has been marked played', () => {
    renderDialog({
      state: 'pending',
      matches: [
        {
          id: 'm1',
          team1Id: 'team-1',
          team2Id: null,
          winnerId: 'team-1',
          team1Score: 0,
          team2Score: null,
          status: 'completed',
        },
      ],
    } as unknown as Partial<PlayoffBracket>);

    expect(screen.getByLabelText('Division')).toBeDisabled();
  });

  it('locks the division while a match is being played, before any score', () => {
    renderDialog({
      state: 'pending',
      matches: [
        {
          id: 'm1',
          team1Id: 'team-1',
          team2Id: 'team-2',
          winnerId: null,
          team1Score: 0,
          team2Score: 0,
          status: 'running',
        },
      ],
    } as unknown as Partial<PlayoffBracket>);

    expect(screen.getByLabelText('Division')).toBeDisabled();
  });

  it('sends the new division when the admin changes it', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByLabelText('Division'));
    await user.click(await screen.findByRole('option', { name: 'Recreational' }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(mutate).toHaveBeenCalledWith(
      { title: 'Summer Finals', division_id: 'd-2' },
      expect.anything()
    );
  });
});
