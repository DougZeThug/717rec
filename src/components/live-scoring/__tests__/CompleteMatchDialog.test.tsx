import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '@/test/a11y';

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

describe('CompleteMatchDialog accessibility', () => {
  it('has no WCAG 2 A/AA axe violations when opened', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: /save official result/i }));

    await expectNoAxeViolations(document.body);
  });
});

describe('CompleteMatchDialog', () => {
  it('opens with the decided best-of-3 summary and confirms finalization', async () => {
    const onConfirm = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: /save official result/i }));

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Baggers wins 2–1')).toBeInTheDocument();
    expect(screen.getByText(/Game 1: Baggers 21–18 Tossers/iu)).toBeInTheDocument();
    expect(screen.getByText(/Game 2: Baggers 15–21 Tossers/iu)).toBeInTheDocument();
    expect(screen.getByText(/Game 3: Baggers 22–20 Tossers/iu)).toBeInTheDocument();

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

  it('renders finalize errors outside the dialog after the confirm action closes it', async () => {
    const onConfirm = vi.fn();
    const { rerender } = render(
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
        isFinalizing={false}
        onConfirm={onConfirm}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /save official result/i }));
    await userEvent.click(await screen.findByRole('button', { name: 'Save result' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    rerender(
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
        isFinalizing={false}
        finalizeError={new Error('The official result was already recorded.')}
        onConfirm={onConfirm}
      />
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save result');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The official result was already recorded.'
    );
  });
});
