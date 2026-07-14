import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, vi } from 'vitest';

import { expectNoAxeViolations } from '@/test/a11y';

import { CompleteMatchDialog } from '../CompleteMatchDialog';

const renderDialog = () =>
  render(
    <CompleteMatchDialog
      team1Name="Baggers"
      team2Name="Tossers"
      winnerName="Baggers"
      gameWins={{ team1: 2, team2: 1 }}
      gameLines={[
        { gameNumber: 1, team1Total: 21, team2Total: 15, winnerName: 'Baggers' },
        { gameNumber: 2, team1Total: 18, team2Total: 21, winnerName: 'Tossers' },
        { gameNumber: 3, team1Total: 21, team2Total: 17, winnerName: 'Baggers' },
      ]}
      isFinalizing={false}
      onConfirm={vi.fn()}
    />
  );

describe('CompleteMatchDialog accessibility', () => {
  it('has no WCAG 2 A/AA axe violations when opened', async () => {
    const user = userEvent.setup();
    const { container } = renderDialog();

    await user.click(screen.getByRole('button', { name: /save official result/i }));

    await expectNoAxeViolations(container);
  });
});
