import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MatchScoreActions from '../components/MatchScoreActions';

const renderActions = (overrides: Partial<React.ComponentProps<typeof MatchScoreActions>> = {}) => {
  const props = {
    onAddGame: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
    hasValidationError: false,
    canAddGames: true,
    team1Wins: 2,
    team2Wins: 1,
    ...overrides,
  };
  render(<MatchScoreActions {...props} />);
  return props;
};

describe('MatchScoreActions', () => {
  it('shows the running game score', () => {
    renderActions();

    expect(screen.getByText('2 - 1')).toBeInTheDocument();
  });

  it('adds a game, saves and cancels from their buttons', async () => {
    const props = renderActions();

    await userEvent.click(screen.getByRole('button', { name: 'Add Game' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Scores' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(props.onAddGame).toHaveBeenCalledTimes(1);
    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('blocks Add Game when no more games can be added', () => {
    renderActions({ canAddGames: false });

    expect(screen.getByRole('button', { name: 'Add Game' })).toBeDisabled();
  });

  it('blocks Save Scores while a score has a validation error', () => {
    renderActions({ hasValidationError: true });

    expect(screen.getByRole('button', { name: 'Save Scores' })).toBeDisabled();
  });

  it('shows Saving... and locks Save and Cancel while submitting', () => {
    renderActions({ isSubmitting: true });

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
