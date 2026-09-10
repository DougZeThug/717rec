import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
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
const moveTeamBooking = vi.fn();

/** A real uuid: the address only accepts one, so a made-up id would be ignored. */
const TEAM_ID = '3f1b2c8e-5a41-4c9d-9f2a-77b0d6e8c123';

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

/**
 * The section reads the night, the team and the block another admin section
 * asked it to open on out of the address, so it runs inside a router.
 */
const renderTab = (entry = '/admin/timeslots') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <TimeslotsTab />
    </MemoryRouter>
  );

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
      moveTeamBooking,
    });
    moveTeamBooking.mockResolvedValue('moved');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // It used to open on today, which is a Monday four nights out of five.
  it('opens on the next league night rather than today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 7, 9)); // Monday 7 September 2026

    renderTab();

    expect(screen.getByRole('button', { name: /September 10th, 2026/ })).toBeInTheDocument();
  });

  it('says which block was booked, not just "timeslots assigned"', async () => {
    const user = userEvent.setup();
    renderTab();

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

    renderTab();

    expect(screen.getByText('submitting:true')).toBeInTheDocument();
  });

  it('assigns a regular timeslot via addTimeslot with a success toast', async () => {
    const user = userEvent.setup();
    renderTab();
    await user.click(screen.getByText('assign-regular'));
    await waitFor(() =>
      expect(addTimeslot).toHaveBeenCalledWith(expect.any(Date), 'team-1', '6:00 PM')
    );
    expect(assignByeWeek).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Timeslot Assigned' }));
  });

  it('routes BYE assignments through assignByeWeek with its own toast', async () => {
    const user = userEvent.setup();
    renderTab();
    await user.click(screen.getByText('assign-bye'));
    await waitFor(() => expect(assignByeWeek).toHaveBeenCalledWith(expect.any(Date), 'team-1'));
    expect(addTimeslot).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Bye Week Assigned' }));
  });

  it('shows an error toast when assignment fails', async () => {
    addTimeslot.mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    renderTab();
    await user.click(screen.getByText('assign-regular'));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }))
    );
  });

  it('splits batch assignment between regular and BYE paths', async () => {
    const user = userEvent.setup();
    renderTab();
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
    renderTab();
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
    renderTab();
    await user.click(screen.getByText('delete-regular'));
    await waitFor(() => expect(deleteTimeslot).toHaveBeenCalledWith('ts-regular'));
    expect(removeByeWeek).not.toHaveBeenCalled();

    await user.click(screen.getByText('delete-bye'));
    await waitFor(() => expect(removeByeWeek).toHaveBeenCalledWith('ts-bye'));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Bye Week Removed' }));
  });
});

// ── Arriving from an approved request ────────────────────────────────────────

/** The two rows one block writes, for the team the address names. */
const blockRows = (first: string, second: string, teamId = TEAM_ID) => [
  {
    id: 'b-1',
    match_date: '2026-09-17',
    timeslot: first,
    team_id: teamId,
    created_at: '2026-09-10T00:00:00Z',
    is_back_to_back: true,
    is_double_header: false,
    pair_slot: second,
    match_sequence: 1,
  },
  {
    id: 'b-2',
    match_date: '2026-09-17',
    timeslot: second,
    team_id: teamId,
    created_at: '2026-09-10T00:00:00Z',
    is_back_to_back: true,
    is_double_header: false,
    pair_slot: first,
    match_sequence: 2,
  },
];

describe('TimeslotsTab, opened by an approved request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeamsQuery.mockReturnValue({
      data: [{ id: TEAM_ID, name: '3 Amigos' }],
      isLoading: false,
    });
    moveTeamBooking.mockResolvedValue('moved');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setNight = (timeslots: unknown[], isNightLoaded = true) =>
    mockUseTimeslots.mockReturnValue({
      timeslots,
      isLoading: false,
      isNightLoaded,
      addTimeslot,
      deleteTimeslot,
      batchAssignTimeslots,
      batchAssignDoubleHeaders,
      assignByeWeek,
      batchAssignByeWeeks,
      removeByeWeek,
      moveTeamBooking,
    });

  it('opens on the night the address names', () => {
    setNight([]);

    renderTab(`/admin/timeslots?date=2026-09-17&team=${TEAM_ID}&slot=7%3A00+PM`);

    expect(screen.getByRole('button', { name: /September 17th, 2026/ })).toBeInTheDocument();
  });

  // A date in the address is only ever an instruction, so a bad one is ignored
  // rather than being allowed to open the section on nothing.
  it('falls back to the next league night when the address names no usable one', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 7, 9)); // Monday 7 September 2026
    setNight([]);

    renderTab(`/admin/timeslots?date=2026-02-31&team=${TEAM_ID}&slot=7%3A00+PM`);

    expect(screen.getByRole('button', { name: /September 10th, 2026/ })).toBeInTheDocument();
  });

  it('states the move in words before it is made', () => {
    setNight(blockRows('6:00 PM', '6:30 PM'));

    renderTab(`/admin/timeslots?date=2026-09-17&team=${TEAM_ID}&slot=7%3A00+PM`);

    expect(screen.getByText('Move 3 Amigos')).toBeInTheDocument();
    expect(screen.getByText(/the 6:00 \+ 6:30 PM block/)).toBeInTheDocument();
    expect(screen.getByText(/the 7:00 \+ 7:30 PM block/)).toBeInTheDocument();
  });

  it('makes the move in one press, clearing exactly the old rows', async () => {
    const user = userEvent.setup();
    setNight(blockRows('6:00 PM', '6:30 PM'));

    renderTab(`/admin/timeslots?date=2026-09-17&team=${TEAM_ID}&slot=7%3A00+PM`);
    await user.click(screen.getByRole('button', { name: 'Move them' }));

    await waitFor(() =>
      expect(moveTeamBooking).toHaveBeenCalledWith(expect.any(Date), TEAM_ID, '7:00 PM', [
        'b-1',
        'b-2',
      ])
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Block booked',
        description: expect.stringContaining('3 Amigos booked for the 7:00 + 7:30 PM block'),
      })
    );
  });

  it('takes the instruction out of the address once the move is made', async () => {
    const user = userEvent.setup();
    setNight(blockRows('6:00 PM', '6:30 PM'));

    renderTab(`/admin/timeslots?date=2026-09-17&team=${TEAM_ID}&slot=7%3A00+PM`);
    await user.click(screen.getByRole('button', { name: 'Move them' }));

    await waitFor(() => expect(screen.queryByText('Move 3 Amigos')).not.toBeInTheDocument());
  });

  // The move already said why it could not happen. The card has to stay, or
  // the admin has nothing to press after changing the night.
  it('leaves the card up when the move was refused', async () => {
    const user = userEvent.setup();
    moveTeamBooking.mockResolvedValue('refused');
    setNight(blockRows('6:00 PM', '6:30 PM'));

    renderTab(`/admin/timeslots?date=2026-09-17&team=${TEAM_ID}&slot=7%3A00+PM`);
    await user.click(screen.getByRole('button', { name: 'Move them' }));

    await waitFor(() => expect(moveTeamBooking).toHaveBeenCalled());
    expect(screen.getByText('Move 3 Amigos')).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it('offers no button, and no guess, when the team has two games that night', () => {
    setNight([
      ...blockRows('6:00 PM', '6:30 PM'),
      {
        id: 'c-1',
        match_date: '2026-09-17',
        timeslot: '8:00 PM',
        team_id: TEAM_ID,
        created_at: '2026-09-10T00:00:00Z',
        is_back_to_back: true,
        is_double_header: true,
        pair_slot: '8:30 PM',
        match_sequence: 1,
      },
    ]);

    renderTab(`/admin/timeslots?date=2026-09-17&team=${TEAM_ID}&slot=7%3A00+PM`);

    expect(screen.getByText('3 Amigos has two games that night')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move them' })).not.toBeInTheDocument();
  });

  it('gives a bye in one press, naming what it removes', async () => {
    const user = userEvent.setup();
    setNight(blockRows('6:00 PM', '6:30 PM'));

    renderTab(`/admin/timeslots?date=2026-09-17&team=${TEAM_ID}&slot=BYE`);
    expect(screen.getByText(/removes the 6:00 \+ 6:30 PM block/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Give the bye' }));

    await waitFor(() =>
      expect(moveTeamBooking).toHaveBeenCalledWith(expect.any(Date), TEAM_ID, 'BYE', ['b-1', 'b-2'])
    );
  });

  // The requested time is free text, so it can be anything. Nothing is booked
  // on a guess.
  it('asks the admin to pick a block when the requested time is not one', () => {
    setNight(blockRows('6:00 PM', '6:30 PM'));

    renderTab(`/admin/timeslots?date=2026-09-17&team=${TEAM_ID}&slot=7ish`);

    expect(screen.getByText('The requested time is not a block')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move them' })).not.toBeInTheDocument();
  });

  it('raises no card at all when the address names no team', () => {
    setNight(blockRows('6:00 PM', '6:30 PM'));

    renderTab('/admin/timeslots?date=2026-09-17&slot=7%3A00+PM');

    expect(screen.queryByText(/^Move 3 Amigos$/)).not.toBeInTheDocument();
  });

  it('puts the card away when the admin says not now', async () => {
    const user = userEvent.setup();
    setNight(blockRows('6:00 PM', '6:30 PM'));

    renderTab(`/admin/timeslots?date=2026-09-17&team=${TEAM_ID}&slot=7%3A00+PM`);
    await user.click(screen.getByRole('button', { name: 'Not now' }));

    await waitFor(() => expect(screen.queryByText('Move 3 Amigos')).not.toBeInTheDocument());
    expect(moveTeamBooking).not.toHaveBeenCalled();
  });

  // The rows on screen belong to the night before until the newly chosen one
  // loads. Planning against them would clear bookings on a night nobody was
  // looking at, because a move clears by row id.
  it('plans nothing until the night on screen is its own', () => {
    setNight(blockRows('6:00 PM', '6:30 PM'), false);

    renderTab(`/admin/timeslots?date=2026-09-17&team=${TEAM_ID}&slot=7%3A00+PM`);

    expect(screen.queryByText('Move 3 Amigos')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move them' })).not.toBeInTheDocument();
  });

  it('shows the words a team used when they name no block', () => {
    setNight(blockRows('6:00 PM', '6:30 PM'));

    renderTab(
      `/admin/timeslots?date=2026-09-17&team=${TEAM_ID}&asked=${encodeURIComponent('as early as possible')}`
    );

    expect(screen.getByText(/"as early as possible"/)).toBeInTheDocument();
  });
});
