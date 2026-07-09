import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RoundScoreInput } from '../RoundScoreInput';

const onSubmit = vi.fn();

const renderInput = (props: Partial<React.ComponentProps<typeof RoundScoreInput>> = {}) =>
  render(
    <RoundScoreInput
      roundNumber={3}
      team1Name="Baggers"
      team2Name="Tossers"
      onSubmit={onSubmit}
      isSubmitting={false}
      {...props}
    />
  );

const grid = (teamName: string) => screen.getByRole('group', { name: `${teamName} round score` });

const tapScore = async (teamName: string, score: number) => {
  const { getByRole } = await import('@testing-library/react').then((m) => ({
    getByRole: m.within(grid(teamName)).getByRole,
  }));
  await userEvent.click(getByRole('button', { name: String(score) }));
};

beforeEach(() => {
  vi.clearAllMocks();
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

    expect(screen.getByRole('button', { name: /save round/i })).toBeDisabled();
    expect(screen.queryByTestId('net-preview')).not.toBeInTheDocument();
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
