import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { MovePlan } from '@/utils/timeslotMove';

import TimeslotMoveCard from '../TimeslotMoveCard';

const plan = (overrides: Partial<MovePlan> = {}): MovePlan => ({
  kind: 'move',
  removeIds: ['b-1', 'b-2'],
  target: '7:00 PM',
  night: { blocks: ['6:00 PM'], hasBye: false, looseTimes: [], rowIds: ['b-1', 'b-2'] },
  ...overrides,
});

const renderCard = (props: Partial<React.ComponentProps<typeof TimeslotMoveCard>> = {}) => {
  const onMove = vi.fn();
  const onDismiss = vi.fn();

  render(
    <TimeslotMoveCard
      plan={plan()}
      teamName="3 Amigos"
      dateLabel="Thursday, 17 September"
      onMove={onMove}
      onDismiss={onDismiss}
      {...props}
    />
  );

  return { onMove, onDismiss };
};

describe('TimeslotMoveCard', () => {
  it('offers one button that makes the change', async () => {
    const user = userEvent.setup();
    const { onMove } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Move them' }));

    expect(onMove).toHaveBeenCalledOnce();
  });

  it('cannot be pressed twice while the change is on its way', () => {
    renderCard({ isSubmitting: true });

    expect(screen.getByRole('button', { name: /Working/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeDisabled();
  });

  it('offers no button for a plan that cannot be one press', () => {
    renderCard({ plan: plan({ kind: 'ambiguous' }) });

    expect(screen.queryByRole('button', { name: 'Move them' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('lets the admin put it away', async () => {
    const user = userEvent.setup();
    const { onDismiss } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Not now' }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  // Moving a booking changes when a team is expected. A match already created
  // for that night keeps its own time, and the card has to say so.
  it('says what a move does not change', () => {
    renderCard();

    expect(
      screen.getByText(/does not change a match that has already been created/)
    ).toBeInTheDocument();
  });
});
