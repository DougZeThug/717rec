import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CompleteMatchDialog } from '../CompleteMatchDialog';

const renderDialog = (
  onConfirm = vi.fn(),
  {
    isFinalizing = false,
    finalizeError,
  }: {
    isFinalizing?: boolean;
    finalizeError?: unknown;
  } = {}
) => {
  render(
    <CompleteMatchDialog
      team1Name="Baggers"
      team2Name="Tossers"
      winnerName="Baggers"
      gameWins={{ team1: 2, team2: 1 }}
      gameLines={[
        { gameNumber: 1, team1Total: 21, team2Total: 18, winnerName: 'Baggers' },
        { gameNumber: 2, team1Total: 15, team2Total: 21, winnerName: 'Tossers' },
        { gameNumber: 3, team1Total: 22, team2Total: 20, winnerName: 'Baggers' },
      ]}
      isFinalizing={isFinalizing}
      finalizeError={finalizeError}
      onConfirm={onConfirm}
    />
  );
  return onConfirm;
};

describe('CompleteMatchDialog', () => {
  it('opens with the decided best-of-3 summary and confirms finalization', async () => {
    const onConfirm = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: /save official result/i }));

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Baggers wins 2–1')).toBeInTheDocument();
    expect(screen.getByText(/Game 1: Baggers 21–18 Tossers/i)).toBeInTheDocument();
    expect(screen.getByText(/Game 2: Baggers 15–21 Tossers/i)).toBeInTheDocument();
    expect(screen.getByText(/Game 3: Baggers 22–20 Tossers/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save result' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels without calling finalize', async () => {
    const onConfirm = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: /save official result/i }));
    await userEvent.click(await screen.findByRole('button', { name: 'Not yet' }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables the trigger and shows the saving label while finalization is pending', () => {
    renderDialog(vi.fn(), { isFinalizing: true });

    expect(screen.getByRole('button', { name: /saving result/i })).toBeDisabled();
  });

  it('renders finalize errors in the dialog instead of crashing', async () => {
    renderDialog(vi.fn(), {
      finalizeError: new Error('The official result was already recorded.'),
    });

    await userEvent.click(screen.getByRole('button', { name: /save official result/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save result');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The official result was already recorded.'
    );
  });
});
