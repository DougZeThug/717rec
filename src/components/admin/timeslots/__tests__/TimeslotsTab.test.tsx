import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TimeslotsTab from '../TimeslotsTab';

const toast = vi.fn();
const mockUseTeamsQuery = vi.fn();
const mockUseTimeslots = vi.fn();

const addTimeslot = vi.fn();
const deleteTimeslot = vi.fn();
const batchAssignTimeslots = vi.fn();
const batchAssignDoubleHeaders = vi.fn();
const assignByeWeek = vi.fn();
const batchAssignByeWeeks = vi.fn();
const removeByeWeek = vi.fn();

vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/teams', () => ({ useTeamsQuery: () => mockUseTeamsQuery() }));
vi.mock('@/hooks/useTimeslots', () => ({
  useTimeslots: (...args: unknown[]) => mockUseTimeslots(...args),
}));
vi.mock('@/utils/logger', () => ({ errorLog: vi.fn() }));

type AssignProps = {
  onAssign: (teamId: string, timeslot: string) => void;
  onBatchAssign: (teamIds: string[], timeslot: string) => void;
  onBatchAssignDoubleHeaders: (teamIds: string[], slot1: string, slot2: string) => void;
  isSubmitting?: boolean;
};

vi.mock('@/components/timeslots/TimeslotAssignment', () => ({
  default: ({ onAssign, onBatchAssign, onBatchAssignDoubleHeaders, isSubmitting }: AssignProps) => (
    <div>
      <span>submitting:{String(isSubmitting)}</span>
      <button onClick={() => onAssign('team-1', '6:00 PM')}>assign-regular</button>
      <button onClick={() => onAssign('team-1', 'BYE')}>assign-bye</button>
      <button onClick={() => onBatchAssign(['team-1', 'team-2'], '7:00 PM')}>batch-regular</button>
      <button onClick={() => onBatchAssign(['team-1', 'team-2'], 'BYE')}>batch-bye</button>
      <button onClick={() => onBatchAssignDoubleHeaders(['team-1'], '6:00 PM', '7:00 PM')}>
        batch-double
      </button>
    </div>
  ),
}));

type ListProps = { onDelete: (id: string) => void };
vi.mock('@/components/timeslots/TimeslotList', () => ({
  default: ({ onDelete }: ListProps) => (
    <div>
      <button onClick={() => onDelete('ts-regular')}>delete-regular</button>
      <button onClick={() => onDelete('ts-bye')}>delete-bye</button>
    </div>
  ),
}));

vi.mock('@/components/ui/calendar', () => ({ Calendar: () => <div>calendar</div> }));

describe('TimeslotsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeamsQuery.mockReturnValue({ data: [], isLoading: false });
    mockUseTimeslots.mockReturnValue({
      timeslots: [
        { id: 'ts-regular', timeslot: '6:00 PM' },
        { id: 'ts-bye', timeslot: 'BYE' },
      ],
      isLoading: false,
      addTimeslot,
      deleteTimeslot,
      batchAssignTimeslots,
      batchAssignDoubleHeaders,
      assignByeWeek,
      batchAssignByeWeeks,
      removeByeWeek,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // It used to open on today, which is a Monday four nights out of five.
  it('opens on the next league night rather than today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 7, 9)); // Monday 7 September 2026

    render(<TimeslotsTab />);

    expect(screen.getByRole('button', { name: /September 10th, 2026/ })).toBeInTheDocument();
  });

  it('says which block was booked, not just "timeslots assigned"', async () => {
    const user = userEvent.setup();
    render(<TimeslotsTab />);

    await user.click(screen.getByText('batch-regular'));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Block booked',
          description: expect.stringContaining('2 teams booked for the 7:00 + 7:30 PM block'),
        })
      )
    );
  });

  it('tells the form when a booking is on its way', () => {
    mockUseTimeslots.mockReturnValue({
      ...mockUseTimeslots(),
      isSubmitting: true,
    });

    render(<TimeslotsTab />);

    expect(screen.getByText('submitting:true')).toBeInTheDocument();
  });

  it('assigns a regular timeslot via addTimeslot with a success toast', async () => {
    const user = userEvent.setup();
    render(<TimeslotsTab />);
    await user.click(screen.getByText('assign-regular'));
    await waitFor(() =>
      expect(addTimeslot).toHaveBeenCalledWith(expect.any(Date), 'team-1', '6:00 PM')
    );
    expect(assignByeWeek).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Timeslot Assigned' }));
  });

  it('routes BYE assignments through assignByeWeek with its own toast', async () => {
    const user = userEvent.setup();
    render(<TimeslotsTab />);
    await user.click(screen.getByText('assign-bye'));
    await waitFor(() => expect(assignByeWeek).toHaveBeenCalledWith(expect.any(Date), 'team-1'));
    expect(addTimeslot).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Bye Week Assigned' }));
  });

  it('shows an error toast when assignment fails', async () => {
    addTimeslot.mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    render(<TimeslotsTab />);
    await user.click(screen.getByText('assign-regular'));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }))
    );
  });

  it('splits batch assignment between regular and BYE paths', async () => {
    const user = userEvent.setup();
    render(<TimeslotsTab />);
    await user.click(screen.getByText('batch-regular'));
    await waitFor(() =>
      expect(batchAssignTimeslots).toHaveBeenCalledWith(
        expect.any(Date),
        ['team-1', 'team-2'],
        '7:00 PM'
      )
    );
    await user.click(screen.getByText('batch-bye'));
    await waitFor(() =>
      expect(batchAssignByeWeeks).toHaveBeenCalledWith(expect.any(Date), ['team-1', 'team-2'])
    );
  });

  it('assigns double headers with both slots', async () => {
    const user = userEvent.setup();
    render(<TimeslotsTab />);
    await user.click(screen.getByText('batch-double'));
    await waitFor(() =>
      expect(batchAssignDoubleHeaders).toHaveBeenCalledWith(
        expect.any(Date),
        ['team-1'],
        '6:00 PM',
        '7:00 PM'
      )
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Double Headers Assigned' })
    );
  });

  it('deletes regular timeslots via deleteTimeslot and BYE rows via removeByeWeek', async () => {
    const user = userEvent.setup();
    render(<TimeslotsTab />);
    await user.click(screen.getByText('delete-regular'));
    await waitFor(() => expect(deleteTimeslot).toHaveBeenCalledWith('ts-regular'));
    expect(removeByeWeek).not.toHaveBeenCalled();

    await user.click(screen.getByText('delete-bye'));
    await waitFor(() => expect(removeByeWeek).toHaveBeenCalledWith('ts-bye'));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Bye Week Removed' }));
  });
});
