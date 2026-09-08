import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pickDefaultEntryDate } from '../defaultEntryDate';

/**
 * The tool used to sort match dates descending and take the first one, which is
 * the furthest *future* night. Once next week's schedule existed the tab opened
 * on a night with nothing to enter. See UX audit A-03.
 */
describe('pickDefaultEntryDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const asDate = (iso: string) => ({ date: iso });

  it('picks the most recent night on or before today, not the furthest future one', () => {
    // A Monday, with a played night behind it and two scheduled ahead.
    vi.setSystemTime(new Date('2026-09-07T12:00:00Z'));

    const chosen = pickDefaultEntryDate([
      asDate('2026-09-17T23:00:00Z'),
      asDate('2026-09-04T00:00:00Z'), // Thu Sep 3, 8 PM EDT
      asDate('2026-09-10T23:00:00Z'),
    ]);

    expect(chosen).not.toBeNull();
    expect(chosen?.getFullYear()).toBe(2026);
    expect(chosen?.getMonth()).toBe(8); // September
    expect(chosen?.getDate()).toBe(3);
  });

  it("counts tonight's late match as today even though it is stored as tomorrow in UTC", () => {
    // Thursday 6 PM EDT === 22:00Z the same day; the 8 PM game is 00:00Z Friday.
    vi.setSystemTime(new Date('2026-09-10T22:00:00Z'));

    const chosen = pickDefaultEntryDate([
      asDate('2026-09-11T00:00:00Z'), // Thu Sep 10, 8 PM EDT
      asDate('2026-09-04T00:00:00Z'), // last week
    ]);

    // Must be tonight, not last Thursday.
    expect(chosen?.getDate()).toBe(10);
  });

  it('falls back to the earliest future night before a season starts', () => {
    vi.setSystemTime(new Date('2026-05-01T12:00:00Z'));

    const chosen = pickDefaultEntryDate([
      asDate('2026-06-25T23:00:00Z'),
      asDate('2026-06-18T23:00:00Z'),
    ]);

    expect(chosen?.getMonth()).toBe(5); // June
    expect(chosen?.getDate()).toBe(18);
  });

  it('returns a local midnight, which is what the date filter expects', () => {
    vi.setSystemTime(new Date('2026-09-07T12:00:00Z'));

    const chosen = pickDefaultEntryDate([asDate('2026-09-04T00:00:00Z')]);

    expect(chosen?.getHours()).toBe(0);
    expect(chosen?.getMinutes()).toBe(0);
    expect(chosen?.getSeconds()).toBe(0);
  });

  it('ignores rows with a missing or unparseable date', () => {
    vi.setSystemTime(new Date('2026-09-07T12:00:00Z'));

    const chosen = pickDefaultEntryDate([
      { date: null },
      { date: undefined },
      { date: 'not a date' },
      asDate('2026-09-04T00:00:00Z'),
    ]);

    expect(chosen?.getDate()).toBe(3);
  });

  it('returns null when nothing has a usable date', () => {
    vi.setSystemTime(new Date('2026-09-07T12:00:00Z'));

    expect(pickDefaultEntryDate([])).toBeNull();
    expect(pickDefaultEntryDate([{ date: null }])).toBeNull();
  });
});
