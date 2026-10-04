import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { openRadixTrigger } from '@/test/radix';
import type { AutoScheduleMatch, Team } from '@/types';
import { ALL_BLOCK_TIMES } from '@/utils/autoSchedule/constants';

import EditableMatchCard from '../EditableMatchCard';

const teams = [
  { id: 't1', name: 'Alpha', imageUrl: null },
  { id: 't2', name: 'Bravo', imageUrl: null },
  { id: 't3', name: 'Charlie', imageUrl: null },
] as unknown as Team[];

const match: AutoScheduleMatch = {
  id: 'm1',
  team1Id: 't1',
  team2Id: 't2',
  timeslot: ALL_BLOCK_TIMES[0],
  date: new Date('2026-09-17'),
};

const handlers = {
  onUpdateTeam: vi.fn(),
  onUpdateTimeslot: vi.fn(),
  onSwapTeams: vi.fn(),
  onRemove: vi.fn(),
};

const renderCard = (props: Partial<React.ComponentProps<typeof EditableMatchCard>> = {}) =>
  render(<EditableMatchCard match={match} teams={teams} {...handlers} {...props} />);

describe('EditableMatchCard', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    Object.values(handlers).forEach((fn) => fn.mockClear());
  });

  it('shows both teams of the match', () => {
    renderCard();

    expect(screen.getByLabelText('Team 1')).toHaveTextContent('Alpha');
    expect(screen.getByLabelText('Team 2')).toHaveTextContent('Bravo');
  });

  it('offers every team except the one already on the other side, for team 1', async () => {
    renderCard();

    await openRadixTrigger(screen.getByLabelText('Team 1'));
    expect(await screen.findByRole('option', { name: /Alpha/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Charlie/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Bravo/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('option', { name: /Charlie/ }));
    expect(handlers.onUpdateTeam).toHaveBeenCalledWith('m1', 'team1', 't3');
  });

  it('offers every team except the one already on the other side, for team 2', async () => {
    renderCard();

    await openRadixTrigger(screen.getByLabelText('Team 2'));
    expect(await screen.findByRole('option', { name: /Bravo/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Alpha/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('option', { name: /Charlie/ }));
    expect(handlers.onUpdateTeam).toHaveBeenCalledWith('m1', 'team2', 't3');
  });

  it('changes the timeslot from the list of block times', async () => {
    renderCard();

    await openRadixTrigger(screen.getByLabelText('Timeslot'));
    await userEvent.click(await screen.findByRole('option', { name: ALL_BLOCK_TIMES[1] }));
    expect(handlers.onUpdateTimeslot).toHaveBeenCalledWith('m1', ALL_BLOCK_TIMES[1]);
  });

  it('swaps the teams and removes the match from its buttons', async () => {
    renderCard();

    await userEvent.click(screen.getByRole('button', { name: 'Swap teams' }));
    expect(handlers.onSwapTeams).toHaveBeenCalledWith('m1');

    await userEvent.click(screen.getByTitle('Remove match'));
    expect(handlers.onRemove).toHaveBeenCalledWith('m1');
  });

  it('shows an error message instead of a rematch warning', () => {
    renderCard({
      hasError: true,
      errorMessage: 'Alpha plays twice in this block',
      hasWarning: true,
      warningMessage: 'Rematch',
    });

    expect(screen.getByText('Alpha plays twice in this block')).toBeInTheDocument();
    expect(screen.queryByText('Rematch')).not.toBeInTheDocument();
  });

  it('shows the rematch warning when there is no error', () => {
    renderCard({ hasWarning: true });

    expect(screen.getByText(/Rematch — these teams have already played/)).toBeInTheDocument();
  });
});
