import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match } from '@/types';
import { groupMatchesByTimeSlot } from '@/utils/timeUtils';

// Return a stable theme so the light/dark branch is deterministic.
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

// Replace the child with a sentinel so we avoid useBatchHeadToHead / MatchCard.
vi.mock('@/components/schedule/TimeSlotMatchGroup', () => ({
  default: ({ timeSlot, matches }: { timeSlot: string; matches: Match[] }) => (
    <div data-testid="time-slot-group" data-slot={timeSlot}>
      {timeSlot} ({matches.length})
    </div>
  ),
}));

import DateMatchGroup from '../DateMatchGroup';

const date = new Date(2026, 5, 24); // Wednesday, June 24 2026
const formattedDate = format(date, 'EEEE, MMMM d');

const matches: Match[] = [
  { id: 'm1', team1Id: 't1', team2Id: 't2', date: '2026-06-24T23:00:00Z', iscompleted: false },
  { id: 'm2', team1Id: 't3', team2Id: 't4', date: '2026-06-25T00:30:00Z', iscompleted: false },
];

describe('DateMatchGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the formatted date header and one TimeSlotMatchGroup per time slot', () => {
    render(<DateMatchGroup date={date} matches={matches} isCurrentDay />);

    expect(screen.getByText(formattedDate)).toBeInTheDocument();

    // Compare against the real grouping utility (runs for real) so the
    // assertion is timezone-independent.
    const expectedSlots = Object.keys(groupMatchesByTimeSlot(matches)).sort();
    const rendered = screen
      .getAllByTestId('time-slot-group')
      .map((el) => el.getAttribute('data-slot'))
      .sort();

    expect(rendered).toEqual(expectedSlots);
    expect(rendered.length).toBeGreaterThan(0);
  });

  it('collapses when the trigger is clicked (aria-expanded toggles to false)', async () => {
    const user = userEvent.setup();
    render(<DateMatchGroup date={date} matches={matches} isCurrentDay />);

    const trigger = screen.getByRole('button', { name: new RegExp(formattedDate) });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the empty-state message when there are no matches', () => {
    render(<DateMatchGroup date={date} matches={[]} isCurrentDay />);

    expect(screen.getByText('No matches scheduled for this date.')).toBeInTheDocument();
    expect(screen.queryAllByTestId('time-slot-group')).toHaveLength(0);
  });
});
