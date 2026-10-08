import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { LiveScoringControls } from '../LiveScoringControls';

const renderControls = (
  overrides: Partial<React.ComponentProps<typeof LiveScoringControls>> = {}
) => {
  const props = {
    canUndo: true,
    isUndoing: false,
    lastRoundLabel: 'Round 3' as string | null,
    onUndo: vi.fn(),
    soundEnabled: true,
    onSoundEnabledChange: vi.fn(),
    ...overrides,
  };
  render(<LiveScoringControls {...props} />);
  return props;
};

describe('LiveScoringControls', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('asks before undoing, names the round, and undoes only after confirming', async () => {
    const user = userEvent.setup();
    const props = renderControls();

    await user.click(screen.getByRole('button', { name: 'Undo last round' }));

    expect(await screen.findByText(/This removes Round 3 from the game/)).toBeInTheDocument();
    expect(props.onUndo).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Undo round' }));
    expect(props.onUndo).toHaveBeenCalledTimes(1);
  });

  it('keeps the round when the scorer cancels', async () => {
    const user = userEvent.setup();
    const props = renderControls({ lastRoundLabel: null });

    await user.click(screen.getByRole('button', { name: 'Undo last round' }));
    expect(
      await screen.findByText('This removes the most recent round from the game.')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep round' }));
    expect(props.onUndo).not.toHaveBeenCalled();
  });

  it('turns undo off when there is nothing to undo or an undo is running', () => {
    renderControls({ canUndo: false });
    expect(screen.getByRole('button', { name: 'Undo last round' })).toBeDisabled();
  });

  it('shows the undoing label while an undo runs', () => {
    renderControls({ isUndoing: true });
    expect(screen.getByRole('button', { name: 'Undoing…' })).toBeDisabled();
  });

  it('reports the sound switch', async () => {
    const user = userEvent.setup();
    const props = renderControls();

    await user.click(screen.getByRole('switch'));

    expect(props.onSoundEnabledChange).toHaveBeenCalledWith(false);
  });
});
