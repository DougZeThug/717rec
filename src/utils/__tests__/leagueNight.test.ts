import { describe, expect, it } from 'vitest';

import { nextThursday } from '../leagueNight';

/** Local-time date, so the test does not depend on the runner's timezone. */
const on = (year: number, month: number, day: number, hour = 9) =>
  new Date(year, month - 1, day, hour);

describe('nextThursday', () => {
  it('jumps forward from a Monday', () => {
    expect(nextThursday(on(2026, 9, 7))).toEqual(on(2026, 9, 10, 12));
  });

  it('stays on today when today is league night', () => {
    expect(nextThursday(on(2026, 9, 10, 19))).toEqual(on(2026, 9, 10, 12));
  });

  it('goes to next week from a Friday', () => {
    expect(nextThursday(on(2026, 9, 11))).toEqual(on(2026, 9, 17, 12));
  });

  it('crosses a month end', () => {
    expect(nextThursday(on(2026, 9, 29))).toEqual(on(2026, 10, 1, 12));
  });

  it('sets noon, so combining it with a time of day cannot slip a day', () => {
    const result = nextThursday(on(2026, 9, 7, 23));
    expect(result.getHours()).toBe(12);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});
