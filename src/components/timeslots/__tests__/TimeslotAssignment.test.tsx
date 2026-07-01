import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team, TeamTimeslot } from '@/types';

import TimeslotAssignment from '../TimeslotAssignment';

// Polyfill ResizeObserver for jsdom (used by Radix ScrollArea / Switch internals)
globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  (class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof ResizeObserver);

const teams: Team[] = [
  { id: 't1', name: 'Team Alpha', imageUrl: 'https://example.com/alpha.png' },
  { id: 't2', name: 'Team Bravo', imageUrl: 'https://example.com/bravo.png' },
  { id: 't3', name: 'Team Charlie', imageUrl: null },
];

const makeTimeslot = (overrides: Partial<TeamTimeslot>): TeamTimeslot => ({
  id: 'ts-1',
  match_date: '2026-07-01',
  timeslot: '7:00 PM',
  team_id: 't1',
  created_at: '2026-07-01T00:00:00.000Z',
  is_back_to_back: false,
  is_double_header: false,
  pair_slot: null,
  match_sequence: null,
  ...overrides,
});

const renderForm = (props?: Partial<React.ComponentProps<typeof TimeslotAssignment>>) => {
  const onAssign = vi.fn();
  const onBatchAssign = vi.fn();
  const onBatchAssignDoubleHeaders = vi.fn();
  render(
    <TimeslotAssignment
      selectedDate={new Date('2026-07-01T12:00:00.000Z')}
      teams={teams}
      existingTimeslots={[]}
      onAssign={onAssign}
      onBatchAssign={onBatchAssign}
      onBatchAssignDoubleHeaders={onBatchAssignDoubleHeaders}
      {...props}
    />
  );
  return { onAssign, onBatchAssign, onBatchAssignDoubleHeaders };
};

describe('TimeslotAssignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the team selection grid and starts with the submit button disabled', () => {
    renderForm();

    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.getByText('Team Bravo')).toBeInTheDocument();
    expect(screen.getByText('Team Charlie')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Confirm Assignment (0 Teams)' })).toBeDisabled();
  });

  it('batch-assigns the selected team and timeslot in single mode', () => {
    const { onBatchAssign } = renderForm();

    // Pick a team card (rendered as a role="button" div).
    fireEvent.click(screen.getByRole('button', { name: /Team Alpha/ }));
    expect(screen.getByText('1 team selected')).toBeInTheDocument();

    // Pick a timeslot from the single-mode ToggleGroup (Radix renders items as radios).
    fireEvent.click(screen.getByRole('radio', { name: '7:00 PM' }));

    const submit = screen.getByRole('button', { name: 'Confirm Assignment (1 Team)' });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    expect(onBatchAssign).toHaveBeenCalledTimes(1);
    expect(onBatchAssign).toHaveBeenCalledWith(['t1'], '7:00 PM');
  });

  it('assigns a double header when the switch is toggled on', () => {
    const { onBatchAssignDoubleHeaders } = renderForm();

    // BYE is offered in single mode.
    expect(screen.getByText('BYE WEEK')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch'));

    // Double-header mode shows the counter badge and drops BYE.
    expect(screen.getByText('0/2 selected')).toBeInTheDocument();
    expect(screen.queryByText('BYE WEEK')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Team Alpha/ }));
    fireEvent.click(screen.getByRole('button', { name: '7:00 PM' }));
    fireEvent.click(screen.getByRole('button', { name: '8:00 PM' }));

    expect(screen.getByText('2/2 selected')).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: 'Confirm Double Header (1 Team)' });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    expect(onBatchAssignDoubleHeaders).toHaveBeenCalledTimes(1);
    expect(onBatchAssignDoubleHeaders).toHaveBeenCalledWith(['t1'], '7:00 PM', '8:00 PM');
  });

  it('filters out teams that already have a timeslot assigned', () => {
    renderForm({ existingTimeslots: [makeTimeslot({ id: 'ts-1', team_id: 't1' })] });

    expect(screen.queryByText('Team Alpha')).not.toBeInTheDocument();
    expect(screen.getByText('Team Bravo')).toBeInTheDocument();
    expect(screen.getByText('Team Charlie')).toBeInTheDocument();
  });
});
