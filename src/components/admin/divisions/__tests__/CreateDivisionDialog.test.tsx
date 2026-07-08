import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import CreateDivisionDialog from '../CreateDivisionDialog';

type MutateOptions = { onSuccess?: () => void };
const mutate = vi.fn();
vi.mock('@/hooks/useDivisionMutations', () => ({
  useDivisionMutations: () => ({ createDivision: { mutate, isPending: false } }),
}));

describe('CreateDivisionDialog', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDialog = (onOpenChange = vi.fn()) => {
    render(<CreateDivisionDialog open onOpenChange={onOpenChange} />);
    return onOpenChange;
  };

  it('blocks submit and shows a message when the name is empty', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('blocks submit when the weight is zero or negative', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText('Name'), 'Comp B');
    const weight = screen.getByLabelText('Weight');
    await user.clear(weight);
    await user.type(weight, '0');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByText('Weight must be a positive number')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('submits trimmed name and numeric weight, then closes on success', async () => {
    const user = userEvent.setup();
    const onOpenChange = renderDialog();
    await user.type(screen.getByLabelText('Name'), '  Comp B  ');
    const weight = screen.getByLabelText('Weight');
    await user.clear(weight);
    await user.type(weight, '0.9');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(mutate).toHaveBeenCalledWith(
      { name: 'Comp B', display_division: 'Recreational', division_weight: 0.9 },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );

    const options = mutate.mock.calls[0][1] as MutateOptions;
    act(() => options.onSuccess?.());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes without submitting via the Cancel button', async () => {
    const user = userEvent.setup();
    const onOpenChange = renderDialog();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mutate).not.toHaveBeenCalled();
  });
});
