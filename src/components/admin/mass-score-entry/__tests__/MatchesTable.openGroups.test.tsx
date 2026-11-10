import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// The real DateMatchGroup and TimeSlotMatchGroup are under test here (MatchesTable.test.tsx
// mocks DateMatchGroup). Only the match card is replaced, to keep the output small.
vi.mock('@/components/admin/mass-score-entry/MatchRow', () => ({
  default: ({ match }: { match: { id: string } }) => <div data-testid={`row-${match.id}`} />,
}));

import DateMatchGroup from '../components/DateMatchGroup';
import TimeSlotMatchGroup from '../components/TimeSlotMatchGroup';
import MatchesTable from '../MatchesTable';
import type { MatchWithTeams } from '../types';

const noop = vi.fn();
const handlers = { onScoreChange: noop, onGameWinsChange: noop, onMarkCompleted: noop };

const makeMatch = (id: string, date: string): MatchWithTeams => ({
  id,
  team1Id: 'team-a',
  team2Id: 'team-b',
  date,
  iscompleted: false,
  winnerId: null,
  loserId: null,
  round_number: 0,
  isEdited: false,
  isValid: true,
});

/**
 * A local-time ISO string. The date groups and the slot labels both read the local clock, so
 * local times keep the night and the slot the same in every time zone the tests run in.
 */
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).toISOString();

/** One match per night at 6 PM. Days are October 2026. */
const nights = (days: number[]) => days.map((d, i) => makeMatch(`n${i}`, at(d, 18)));

/** Six matches on one night, three at 6 PM and three at 7 PM: two slots. */
const busyNight = (day: number) => [
  ...[0, 1, 2].map((i) => makeMatch(`b${i}`, at(day, 18))),
  ...[3, 4, 5].map((i) => makeMatch(`b${i}`, at(day, 19))),
];

const dateTrigger = (name: RegExp) => screen.getByRole('button', { name });
const slotTriggers = () => screen.getAllByRole('button', { name: /\d+ match(es)?$/ });

// Phone polish Wave 3: the Scores tool first renders every night it fetched, then only tonight.
// Tonight was not the first group in the first render, so it mounted closed, and useState kept it
// closed when it became the only (first) group under the same key.
describe('MatchesTable: tonight opens when the list shrinks to it', () => {
  it('opens tonight and its first time slot when five nights shrink to the last one', () => {
    const five = nights([1, 8, 15, 22, 29]);
    const { rerender } = render(<MatchesTable {...handlers} matches={five} loading={false} />);

    // Five nights: only the first opens, so tonight (the last) starts closed.
    expect(dateTrigger(/October 29, 2026/)).toHaveAttribute('aria-expanded', 'false');

    rerender(<MatchesTable {...handlers} matches={[five[4]]} loading={false} />);

    expect(dateTrigger(/October 29, 2026/)).toHaveAttribute('aria-expanded', 'true');
    expect(slotTriggers()[0]).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens the first slot of a busy night when three nights shrink to it', () => {
    const busy = busyNight(29);
    const three = [...nights([15, 22]), ...busy];
    const { rerender } = render(<MatchesTable {...handlers} matches={three} loading={false} />);

    // Three nights or fewer: every night is open, but a night of more than five matches opens
    // only its first slot, and only when it is the first night. Tonight is the third.
    const tonight = dateTrigger(/October 29, 2026/);
    expect(tonight).toHaveAttribute('aria-expanded', 'true');
    const tonightGroup = tonight.parentElement as HTMLElement;
    const before = within(tonightGroup).getAllByRole('button', { name: /3 matches$/ });
    expect(before[0]).toHaveAttribute('aria-expanded', 'false');

    rerender(<MatchesTable {...handlers} matches={busy} loading={false} />);

    const after = slotTriggers();
    expect(after).toHaveLength(2);
    expect(after[0]).toHaveAttribute('aria-expanded', 'true');
    // The second slot keeps its own default (closed): only the first slot is opened for you.
    expect(after[1]).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('date and time-slot groups never close themselves', () => {
  it('keeps a night open when its default goes from open to closed', () => {
    const matches = nights([29]);
    const props = { ...handlers, date: new Date(2026, 9, 29), matches };
    const { rerender } = render(<DateMatchGroup {...props} defaultExpanded />);
    expect(dateTrigger(/October 29, 2026/)).toHaveAttribute('aria-expanded', 'true');

    rerender(<DateMatchGroup {...props} defaultExpanded={false} />);

    expect(dateTrigger(/October 29, 2026/)).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps a time slot open when its default goes from open to closed', () => {
    const props = { ...handlers, timeSlot: '6:00 PM', matches: [] };
    const { rerender } = render(<TimeSlotMatchGroup {...props} defaultOpen />);
    const trigger = () => screen.getByRole('button', { name: /6:00 PM/ });
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');

    rerender(<TimeSlotMatchGroup {...props} defaultOpen={false} />);

    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
  });

  it('leaves a group the admin closed alone while its default does not change', () => {
    const props = { ...handlers, timeSlot: '6:00 PM', matches: [] };
    const { rerender } = render(<TimeSlotMatchGroup {...props} defaultOpen />);
    const trigger = () => screen.getByRole('button', { name: /6:00 PM/ });

    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');

    rerender(<TimeSlotMatchGroup {...props} defaultOpen />);

    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });
});
