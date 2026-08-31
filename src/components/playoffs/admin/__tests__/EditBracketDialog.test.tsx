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

    expect(mutate).toHaveBeenCalledWith(
      { title: 'Summer Championship', division_id: 'd-1' },
      expect.anything()
    );
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
});
