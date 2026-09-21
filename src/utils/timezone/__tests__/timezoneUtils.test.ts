import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createEveningAwareDateRange,
  extractTimeSlotFromUTC,
  formatLeagueTimeString,
  formatTimeString,
  formatUTCToLocalTimeString,
  getLeagueMidnightUtc,
  getLeagueTimeUtc,
  normalizeTimeString,
  parseTimeString,
  toLocalDate,
  toUTCDate,
} from '@/utils/timezone';

const buildDateTimeFormatResult = (formatted: string): Intl.DateTimeFormat =>
  ({
    format: () => formatted,
    resolvedOptions: () =>
      ({
        locale: 'en-US',
        calendar: 'gregory',
        numberingSystem: 'latn',
        timeZone: 'UTC',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }) as Intl.ResolvedDateTimeFormatOptions,
  }) as unknown as Intl.DateTimeFormat;

describe('timezone utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    { label: 'empty input', input: '', expected: { hours: 0, minutes: 0 } },
    { label: 'invalid format', input: 'not-a-time', expected: { hours: 0, minutes: 0 } },
    { label: '12-hour pm', input: '7:30 PM', expected: { hours: 19, minutes: 30 } },
    { label: '12 AM edge', input: '12:05 AM', expected: { hours: 0, minutes: 5 } },
    { label: '24-hour style', input: '21:45', expected: { hours: 21, minutes: 45 } },
  ])('parseTimeString: $label', ({ input, expected }) => {
    expect(parseTimeString(input)).toEqual(expected);
  });

  it('toUTCDate and toLocalDate keep the same instant', () => {
    const input = new Date('2026-01-15T19:30:00.000Z');
    const utc = toUTCDate(input);
    const localFromDate = toLocalDate(utc);
    const localFromString = toLocalDate(utc.toISOString());

    expect(utc.toISOString()).toBe('2026-01-15T19:30:00.000Z');
    expect(localFromDate.getTime()).toBe(input.getTime());
    expect(localFromString.getTime()).toBe(input.getTime());
  });

  it.each([
    { hours: 0, minutes: 5, use24Hour: false, expected: '12:05 AM' },
    { hours: 13, minutes: 45, use24Hour: false, expected: '1:45 PM' },
    { hours: 6, minutes: 0, use24Hour: true, expected: '06:00' },
  ])('formatTimeString %#', ({ hours, minutes, use24Hour, expected }) => {
    expect(formatTimeString(hours, minutes, use24Hour)).toBe(expected);
  });

  it.each([
    { label: 'already allowed', input: '7:30 PM', expected: '7:30 PM' },
    { label: '24-hour format falls back to original', input: '19:30', expected: '19:30' },
    { label: 'unmappable fallback', input: '3:15 PM', expected: '3:15 PM' },
    { label: 'empty input', input: '', expected: '' },
  ])('normalizeTimeString: $label', ({ input, expected }) => {
    expect(normalizeTimeString(input)).toBe(expected);
  });

  // The range is built from the date's LOCAL calendar day, so the input is built
  // from the local clock too. Parsed from a UTC string it named a different day
  // east of UTC, and the assertion moved with the runner's timezone.
  it('createEveningAwareDateRange spans selected day through following UTC day', () => {
    const date = new Date(2026, 9, 31, 12, 0, 0);
    const range = createEveningAwareDateRange(date);

    expect(range).toEqual({
      startDate: new Date('2026-10-31T00:00:00.000Z'),
      endDate: new Date('2026-11-01T23:59:59.000Z'),
    });
  });

  it('extractTimeSlotFromUTC returns exact slots when formatter output matches', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function () {
      return buildDateTimeFormatResult('7:30 PM');
    } as unknown as typeof Intl.DateTimeFormat);

    expect(extractTimeSlotFromUTC('2026-03-01T00:00:00.000Z')).toBe('7:30 PM');
  });

  it.each([
    { formatted: '6:10 PM', expected: '6:00 PM' },
    { formatted: '6:40 PM', expected: '6:30 PM' },
    { formatted: '9:50 PM', expected: '10:00 PM' },
    { formatted: 'bad-data', expected: 'No Time' },
  ])('extractTimeSlotFromUTC normalization for $formatted', ({ formatted, expected }) => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function () {
      return buildDateTimeFormatResult(formatted);
    } as unknown as typeof Intl.DateTimeFormat);

    expect(extractTimeSlotFromUTC(new Date('2026-03-01T00:00:00.000Z'))).toBe(expected);
  });

  it('formatUTCToLocalTimeString supports 24-hour and seconds options', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
      _locales: unknown,
      options?: Intl.DateTimeFormatOptions
    ) {
      const formatted =
        options?.hour12 === false && options?.second === '2-digit' ? '19:30:00' : '7:30 PM';
      return buildDateTimeFormatResult(formatted);
    } as unknown as typeof Intl.DateTimeFormat);

    const date = new Date('2026-03-01T19:30:00.000Z');
    expect(formatUTCToLocalTimeString(date)).toBe('7:30 PM');
    expect(formatUTCToLocalTimeString(date, { use24Hour: true, includeSeconds: true })).toBe(
      '19:30:00'
    );
  });

  it.each([
    {
      label: 'January EST midnight',
      year: 2026,
      month: 1,
      day: 15,
      expected: '2026-01-15T05:00:00.000Z',
    },
    {
      label: 'July EDT midnight',
      year: 2026,
      month: 7,
      day: 15,
      expected: '2026-07-15T04:00:00.000Z',
    },
  ])('getLeagueMidnightUtc returns correct UTC for $label', ({ year, month, day, expected }) => {
    expect(getLeagueMidnightUtc(year, month, day).toISOString()).toBe(expected);
  });
});

// These blocks must not be nested inside the ones above that stub
// Intl.DateTimeFormat: those stubs expose only format() and resolvedOptions(),
// and everything here needs the real formatToParts().
describe('league wall-clock conversions', () => {
  // An 8:30 PM league match is stored on the next UTC day, and the offset is a
  // different hour in winter than in summer, so both halves have to be measured
  // at the target instant rather than assumed.
  it.each([
    { label: 'EDT evening', y: 2026, m: 8, d: 20, h: 19, mi: 0, iso: '2026-08-20T23:00:00.000Z' },
    { label: 'EST evening', y: 2026, m: 1, d: 15, h: 18, mi: 30, iso: '2026-01-15T23:30:00.000Z' },
    {
      label: 'late slot rolling into the next UTC day',
      y: 2026,
      m: 8,
      d: 20,
      h: 20,
      mi: 30,
      iso: '2026-08-21T00:30:00.000Z',
    },
    {
      label: 'the day the clocks go forward',
      y: 2026,
      m: 3,
      d: 8,
      h: 18,
      mi: 30,
      iso: '2026-03-08T22:30:00.000Z',
    },
    {
      label: 'the day the clocks go back',
      y: 2026,
      m: 11,
      d: 1,
      h: 18,
      mi: 30,
      iso: '2026-11-01T23:30:00.000Z',
    },
  ])('getLeagueTimeUtc places $label', ({ y, m, d, h, mi, iso }) => {
    expect(getLeagueTimeUtc(y, m, d, h, mi).toISOString()).toBe(iso);
  });

  it('getLeagueTimeUtc at no hour is getLeagueMidnightUtc', () => {
    expect(getLeagueTimeUtc(2026, 7, 15).toISOString()).toBe(
      getLeagueMidnightUtc(2026, 7, 15).toISOString()
    );
  });

  // This suite runs in UTC, where the browser-clock answers would be 11:00 PM,
  // 11:30 PM and 12:30 AM. So these assertions fail loudly if the form is ever
  // put back on the viewer's clock.
  it.each([
    { iso: '2026-08-20T23:00:00.000Z', slot: '7:00 PM' },
    { iso: '2026-01-15T23:30:00.000Z', slot: '6:30 PM' },
    { iso: '2026-08-21T00:30:00.000Z', slot: '8:30 PM' },
  ])('formatLeagueTimeString reads $iso as $slot', ({ iso, slot }) => {
    expect(formatLeagueTimeString(new Date(iso))).toBe(slot);
  });

  it('formatLeagueTimeString gives no slot for a date it cannot read', () => {
    expect(formatLeagueTimeString(new Date('not a date'))).toBe('');
  });

  it('formatLeagueTimeString round-trips getLeagueTimeUtc', () => {
    expect(formatLeagueTimeString(getLeagueTimeUtc(2026, 8, 20, 20, 30))).toBe('8:30 PM');
  });

  // Scope guard. The form fix deliberately left the schedule's time-slot grouping
  // on the reader's own clock, so fixing an admin form cannot silently re-group
  // the schedule for every reader outside Eastern. Built from the runner's clock,
  // so it is 7 PM wherever the test runs: a function reading the viewer's clock
  // answers 7:00 PM in every timezone, and one switched to league time would not.
  it('leaves extractTimeSlotFromUTC reading the viewer clock', () => {
    expect(extractTimeSlotFromUTC(new Date(2026, 7, 20, 19, 0))).toBe('7:00 PM');
  });
});
