import { describe, expect, it } from 'vitest';

import { deriveWeekNumber, getWeekWindow, parseSeasonStart } from '../weekWindow';

// Season starts Thursday 4 September 2026 (league time). Matches are played on
// Thursday evenings, which is exactly the case raw UTC arithmetic gets wrong.
const SEASON_START = '2026-09-04';

describe('parseSeasonStart', () => {
  it('reads a plain calendar date', () => {
    expect(parseSeasonStart('2026-09-04')).toEqual({ year: 2026, month: 9, day: 4 });
  });

  it('tolerates an ISO timestamp form', () => {
    expect(parseSeasonStart('2026-09-04T00:00:00+00:00')).toEqual({
      year: 2026,
      month: 9,
      day: 4,
    });
  });
});

describe('deriveWeekNumber', () => {
  it('puts the season start date in week 1', () => {
    // Noon UTC on the start date is still the start date in league time.
    expect(deriveWeekNumber(SEASON_START, new Date('2026-09-04T16:00:00Z'))).toBe(1);
  });

  it('keeps a Thursday 8 PM match in its own week, not the next one', () => {
    // 8 PM EDT on Thursday 10 September is stored as Friday 11 September UTC.
    // Counting UTC days would make this day 7 and push it into week 2.
    const thursdayEvening = new Date('2026-09-11T00:00:00Z');
    expect(deriveWeekNumber(SEASON_START, thursdayEvening)).toBe(1);
  });

  it('rolls to the next week on the seventh league day', () => {
    expect(deriveWeekNumber(SEASON_START, new Date('2026-09-11T16:00:00Z'))).toBe(2);
  });

  it('counts a later week correctly', () => {
    // 15 October is 41 days after 4 September -> week 6.
    expect(deriveWeekNumber(SEASON_START, new Date('2026-10-15T16:00:00Z'))).toBe(6);
  });

  it('clamps a date before the season start to week 1', () => {
    expect(deriveWeekNumber(SEASON_START, new Date('2026-08-20T16:00:00Z'))).toBe(1);
  });
});

describe('getWeekWindow', () => {
  it('starts week 1 at league midnight on the season start date', () => {
    const { weekStart } = getWeekWindow(SEASON_START, 1);
    // 4 September 2026 is EDT (UTC-4), so league midnight is 04:00 UTC.
    expect(weekStart.toISOString()).toBe('2026-09-04T04:00:00.000Z');
  });

  it('is half-open: one week ends exactly where the next begins', () => {
    const { weekEnd } = getWeekWindow(SEASON_START, 1);
    const { weekStart } = getWeekWindow(SEASON_START, 2);
    expect(weekEnd.toISOString()).toBe(weekStart.toISOString());
  });

  it('keeps a week spanning the daylight saving change seven league days long', () => {
    // US clocks go back on Sunday 1 November 2026, inside week 9
    // (29 October - 5 November). Seven league days is 169 UTC hours, not 168.
    const { weekStart, weekEnd } = getWeekWindow(SEASON_START, 9);
    const hours = (weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60);

    expect(hours).toBe(169);
  });

  it('round-trips with deriveWeekNumber', () => {
    const { weekStart, weekEnd } = getWeekWindow(SEASON_START, 4);

    expect(deriveWeekNumber(SEASON_START, weekStart)).toBe(4);
    // weekEnd is excluded, so the last instant inside the window is a moment before.
    expect(deriveWeekNumber(SEASON_START, new Date(weekEnd.getTime() - 1))).toBe(4);
    expect(deriveWeekNumber(SEASON_START, weekEnd)).toBe(5);
  });
});
