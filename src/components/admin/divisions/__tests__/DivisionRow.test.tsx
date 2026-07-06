import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import DivisionRow from '../DivisionRow';

type MutateOptions = { onSuccess?: () => void };
const updateMutate = vi.fn();
const deleteMutate = vi.fn();
vi.mock('@/hooks/useDivisionMutations', () => ({
  useDivisionMutations: () => ({
    updateDivision: { mutate: updateMutate, isPending: false },
    deleteDivision: { mutate: deleteMutate, isPending: false },
  }),
}));

const division = {
  id: 'd1',
  name: 'Competitive A',
  division_weight: 1,
  display_division: 'Competitive',
};

const renderRow = (overrides: Partial<typeof division> = {}) =>
  render(<DivisionRow division={{ ...division, ...overrides }} layout="card" />);

describe('DivisionRow', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves edited name and weight through the update mutation', async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole('button', { name: /edit/i }));
    const nameInput = screen.getByLabelText('Division name');
    await user.clear(nameInput);
    await user.type(nameInput, '  Comp Elite  ');
    const weightInput = screen.getByRole('spinbutton');
    await user.clear(weightInput);
    await user.type(weightInput, '1.1');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(updateMutate).toHaveBeenCalledWith(
      {
        id: 'd1',
        patch: { name: 'Comp Elite', display_division: 'Competitive', division_weight: 1.1 },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );

    const options = updateMutate.mock.calls[0][1] as MutateOptions;
    act(() => options.onSuccess?.());
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('refuses to save an empty name or non-positive weight', async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await user.clear(screen.getByLabelText('Division name'));
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(updateMutate).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Division name'), 'Comp A');
    const weightInput = screen.getByRole('spinbutton');
    await user.clear(weightInput);
    await user.type(weightInput, '0');
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('cancel restores the original values and leaves edit mode', async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole('button', { name: /edit/i }));
    const nameInput = screen.getByLabelText('Division name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Scratch');
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(updateMutate).not.toHaveBeenCalled();
    expect(screen.getByText('Competitive A')).toBeInTheDocument();
  });

  it('deletes only after confirming the alert dialog', async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole('button', { name: 'Delete division Competitive A' }));
    expect(screen.getByText('Delete division "Competitive A"?')).toBeInTheDocument();
    expect(deleteMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deleteMutate).toHaveBeenCalledWith('d1', expect.anything());
  });

  it('disables edit and delete for Hidden divisions', () => {
    renderRow({ display_division: 'Hidden' });
    expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete division Competitive A' })).toBeDisabled();
  });
});
