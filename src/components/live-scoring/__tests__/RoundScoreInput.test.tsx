import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RoundScoreInput } from '../RoundScoreInput';

const onSubmit = vi.fn();
const onSelectionDiscarded = vi.fn();

const inputElement = (props: Partial<React.ComponentProps<typeof RoundScoreInput>> = {}) => (
  <RoundScoreInput
    roundNumber={3}
    team1Name="Baggers"
    team2Name="Tossers"
    onSubmit={onSubmit}
    roundKey="game-1:3"
    onSelectionDiscarded={onSelectionDiscarded}
    isSubmitting={false}
    {...props}
  />
);

const renderInput = (props: Partial<React.ComponentProps<typeof RoundScoreInput>> = {}) =>
  render(inputElement(props));

const grid = (teamName: string) => screen.getByRole('group', { name: `${teamName} round score` });

const tapScore = async (teamName: string, score: number) => {
  const { getByRole } = await import('@testing-library/react').then((m) => ({
    getByRole: m.within(grid(teamName)).getByRole,
  }));
  await userEvent.click(getByRole('button', { name: String(score) }));
};

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations, so drop any rejection a test installed.
  onSubmit.mockReset();
});

describe('RoundScoreInput', () => {
  it('offers every valid score and never 11', () => {
    renderInput();
    const team1Grid = grid('Baggers');
    for (const score of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12]) {
      expect(
        Array.from(team1Grid.querySelectorAll('button')).some(
          (b) => b.textContent === String(score)
        )
      ).toBe(true);
    }
    expect(
      Array.from(team1Grid.querySelectorAll('button')).some((b) => b.textContent === '11')
    ).toBe(false);
  });

  it('submits unambiguous scores with inferred bag breakdowns', async () => {
    renderInput();

    await tapScore('Baggers', 8);
    await tapScore('Tossers', 5);
    await userEvent.click(screen.getByRole('button', { name: /save round/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      team1Score: 8,
      team2Score: 5,
      team1Bags: { bagsIn: 2, bagsOn: 2, bagsOff: 0 },
      team2Bags: { bagsIn: 1, bagsOn: 2, bagsOff: 1 },
    });
  });

  it('blocks submission until an ambiguous score (6) is disambiguated', async () => {
    renderInput();

    await tapScore('Baggers', 6);
    await tapScore('Tossers', 0);

    const save = screen.getByRole('button', { name: /save round/i });
    expect(save).toBeDisabled();
    expect(screen.getByText(/how many bags in the hole/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '2 in the hole' }));
    expect(save).toBeEnabled();

    await userEvent.click(save);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        team1Score: 6,
        team1Bags: { bagsIn: 2, bagsOn: 0, bagsOff: 2 },
      })
    );
  });

  it('previews the cancellation result once both scores are picked', async () => {
    renderInput();

    await tapScore('Baggers', 8);
    await tapScore('Tossers', 5);

    expect(screen.getByTestId('net-preview')).toHaveTextContent('Baggers +3');
  });

  it('previews a wash for tied scores', async () => {
    renderInput();

    await tapScore('Baggers', 5);
    await tapScore('Tossers', 5);

    expect(screen.getByTestId('net-preview')).toHaveTextContent(/wash/i);
  });

  it('clears the selection after submitting', async () => {
    renderInput();

    await tapScore('Baggers', 8);
    await tapScore('Tossers', 5);
    await userEvent.click(screen.getByRole('button', { name: /save round/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /save round/i })).toBeDisabled());
    expect(screen.queryByTestId('net-preview')).not.toBeInTheDocument();
  });

  it('keeps the selection when the save fails, so the scorer can retry', async () => {
    onSubmit.mockRejectedValue(new Error('Failed to fetch'));
    renderInput();

    await tapScore('Baggers', 8);
    await tapScore('Tossers', 5);
    await userEvent.click(screen.getByRole('button', { name: /save round/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(screen.getByTestId('net-preview')).toHaveTextContent('Baggers +3');
    expect(screen.getByRole('button', { name: /save round/i })).toBeEnabled();
  });

  it('keeps an ambiguous score and its bag answer when the save fails', async () => {
    onSubmit.mockRejectedValue(new Error('Failed to fetch'));
    renderInput();

    await tapScore('Baggers', 6);
    await tapScore('Tossers', 0);
    await userEvent.click(screen.getByRole('button', { name: '2 in the hole' }));
    await userEvent.click(screen.getByRole('button', { name: /save round/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    // Save is only enabled while an ambiguous score still carries its bag
    // answer, so an enabled button proves both survived the failure.
    expect(screen.getByRole('button', { name: /save round/i })).toBeEnabled();
    expect(screen.getByTestId('net-preview')).toHaveTextContent('Baggers +6');
    expect(screen.queryByText(/how many bags in the hole/i)).not.toBeInTheDocument();
  });

  it('drops kept scores and reports it when the round moves on', async () => {
    onSubmit.mockRejectedValue(new Error('Failed to fetch'));
    const { rerender } = renderInput();

    await tapScore('Baggers', 8);
    await tapScore('Tossers', 5);
    await userEvent.click(screen.getByRole('button', { name: /save round/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(screen.getByTestId('net-preview')).toBeInTheDocument();

    rerender(inputElement({ roundNumber: 4, roundKey: 'game-1:4' }));

    expect(screen.queryByTestId('net-preview')).not.toBeInTheDocument();
    expect(onSelectionDiscarded).toHaveBeenCalledTimes(1);
  });

  it('ignores the round number moving while the save is still in flight', async () => {
    onSubmit.mockReturnValue(new Promise(() => {}));
    const { rerender } = renderInput();

    await tapScore('Baggers', 8);
    await tapScore('Tossers', 5);
    await userEvent.click(screen.getByRole('button', { name: /save round/i }));

    // This is the optimistic round bumping the heading, not another scorer.
    rerender(inputElement({ roundNumber: 4, roundKey: 'game-1:4', isSubmitting: true }));

    expect(screen.getByTestId('net-preview')).toHaveTextContent('Baggers +3');
    expect(onSelectionDiscarded).not.toHaveBeenCalled();
  });

  it('says nothing when the round moves on with no scores tapped', () => {
    const { rerender } = renderInput();

    rerender(inputElement({ roundNumber: 4, roundKey: 'game-1:4' }));

    expect(screen.queryByTestId('net-preview')).not.toBeInTheDocument();
    expect(onSelectionDiscarded).not.toHaveBeenCalled();
  });

  it('disables everything while a round is being saved', () => {
    renderInput({ isSubmitting: true });

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    const team1Grid = grid('Baggers');
    for (const button of team1Grid.querySelectorAll('button')) {
      expect(button).toBeDisabled();
    }
  });
});
