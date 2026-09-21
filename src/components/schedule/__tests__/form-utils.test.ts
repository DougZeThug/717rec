import { describe, expect, it } from 'vitest';

import {
  buildMatchSubmission,
  describeUnsavableMatch,
  getTimeSlotFromDate,
  leagueDayFromStoredDate,
  parseDateFromInput,
} from '../form-utils';
import type { MatchFormValues } from '../types';

const values = (overrides: Partial<MatchFormValues> = {}): MatchFormValues => ({
  team1Id: 'team-a',
  team2Id: 'team-b',
  date: new Date('2026-05-01T12:00:00Z'),
  timeSlot: '18:00',
  isCompleted: false,
  ...overrides,
});

describe('describeUnsavableMatch', () => {
  /**
   * Equal scores leave determineMatchOutcome with no winner, and no writer can
   * store a completed match without one -- the result RPCs are gated on a
   * winner and a loser, and the plain update excludes iscompleted by type. The
   * save used to drop the completion and report success anyway.
   */
  it('refuses a completed match whose scores are equal', () => {
    expect(
      describeUnsavableMatch(values({ isCompleted: true, team1Score: 15, team2Score: 15 }))
    ).toMatch(/needs a winner/i);
  });

  it('refuses a completed match with no scores at all', () => {
    // Both undefined are equal too, so this is the same no-winner payload.
    expect(describeUnsavableMatch(values({ isCompleted: true }))).toMatch(/needs a winner/i);
  });

  it('allows a completed match with a decisive score', () => {
    expect(
      describeUnsavableMatch(values({ isCompleted: true, team1Score: 21, team2Score: 15 }))
    ).toBeNull();
  });

  it('allows equal scores while the match stays open', () => {
    // The rule is about completion, not about the numbers on their own.
    expect(
      describeUnsavableMatch(values({ isCompleted: false, team1Score: 15, team2Score: 15 }))
    ).toBeNull();
  });

  it('does not mention the unresolved-matches queue', () => {
    // That queue only confirms a tie that already exists; nothing in the app
    // can create one, so pointing an admin there would be a dead end.
    const message = describeUnsavableMatch(
      values({ isCompleted: true, team1Score: 15, team2Score: 15 })
    );
    expect(message).not.toMatch(/unresolved|tie/i);
  });
});

describe('buildMatchSubmission', () => {
  it('carries the scores and the decided winner on a completed match', () => {
    const payload = buildMatchSubmission(
      values({ isCompleted: true, team1Score: 21, team2Score: 15 })
    );

    expect(payload).toMatchObject({
      team1Id: 'team-a',
      team2Id: 'team-b',
      iscompleted: true,
      team1Score: 21,
      team2Score: 15,
      winnerId: 'team-a',
      loserId: 'team-b',
      timeSlot: '18:00',
    });
  });

  it('names the second team when it has the higher score', () => {
    const payload = buildMatchSubmission(
      values({ isCompleted: true, team1Score: 15, team2Score: 21 })
    );

    expect(payload).toMatchObject({ winnerId: 'team-b', loserId: 'team-a' });
  });

  it('leaves the scores off an open match, so reopening clears a stale result', () => {
    const payload = buildMatchSubmission(
      values({ isCompleted: false, team1Score: 21, team2Score: 15 })
    );

    expect(payload.iscompleted).toBe(false);
    expect(payload.team1Score).toBeUndefined();
    expect(payload.team2Score).toBeUndefined();
    expect(payload.winnerId).toBeUndefined();
    expect(payload.loserId).toBeUndefined();
  });

  it('sends the date as an ISO string', () => {
    const payload = buildMatchSubmission(values());

    expect(payload.date).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(payload.date as string))).toBe(false);
  });
});

// The form used to build the stored instant with setHours on the browser's own
// clock, so the answer depended on where the admin was sitting. Every case here
// asserts an exact league instant, which is why they also pass under TZ=UTC,
// TZ=America/Los_Angeles and TZ=Asia/Kolkata.
describe('a night and a slot become one instant, in league time', () => {
  const storedFor = (day: string, timeSlot: string) =>
    buildMatchSubmission(values({ date: parseDateFromInput(day), timeSlot })).date;

  it.each([
    {
      label: 'a summer evening (EDT)',
      day: '2026-08-20',
      slot: '7:00 PM',
      iso: '2026-08-20T23:00:00.000Z',
    },
    {
      label: 'a winter evening (EST)',
      day: '2026-01-15',
      slot: '6:30 PM',
      iso: '2026-01-15T23:30:00.000Z',
    },
    {
      label: 'a late slot, which lands on the next UTC day',
      day: '2026-08-20',
      slot: '8:30 PM',
      iso: '2026-08-21T00:30:00.000Z',
    },
  ])('stores $label', ({ day, slot, iso }) => {
    expect(storedFor(day, slot)).toBe(iso);
  });

  it('reads a stored instant back as the slot that was picked', () => {
    expect(getTimeSlotFromDate(new Date('2026-08-20T23:00:00.000Z'))).toBe('7:00 PM');
  });

  it('opens the date field on the league night, not the UTC day', () => {
    // 8:30 PM Eastern on the 20th is stored on the 21st in UTC. The field must
    // still say the 20th, which is the night the league played.
    const field = leagueDayFromStoredDate('2026-08-21T00:30:00.000Z');

    expect(field.getFullYear()).toBe(2026);
    expect(field.getMonth() + 1).toBe(8);
    expect(field.getDate()).toBe(20);
  });

  it('falls back to a usable date when the stored one cannot be read', () => {
    expect(Number.isNaN(leagueDayFromStoredDate('not a date').getTime())).toBe(false);
  });

  // The whole point: opening a stored match and saving it again without touching
  // anything must not move it. This is the trip that used to shift the match by
  // the admin's offset, a whole league day for an admin east of the league.
  it('closes the trip: stored instant in, identical instant out', () => {
    const stored = '2026-08-21T00:30:00.000Z';

    const resaved = buildMatchSubmission(
      values({
        date: leagueDayFromStoredDate(stored),
        timeSlot: getTimeSlotFromDate(new Date(stored)),
      })
    ).date;

    expect(resaved).toBe(stored);
  });

  it('closes the trip across the winter offset too', () => {
    const stored = '2026-01-15T23:30:00.000Z';

    const resaved = buildMatchSubmission(
      values({
        date: leagueDayFromStoredDate(stored),
        timeSlot: getTimeSlotFromDate(new Date(stored)),
      })
    ).date;

    expect(resaved).toBe(stored);
  });

  it('leaves the date alone when no slot was picked', () => {
    const day = parseDateFromInput('2026-08-20');

    expect(buildMatchSubmission(values({ date: day, timeSlot: null })).date).toBe(
      day.toISOString()
    );
  });
});
