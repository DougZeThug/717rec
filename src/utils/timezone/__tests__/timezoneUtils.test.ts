import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createEveningAwareDateRange,
  createUTCDateWithTime,
  extractTimeSlotFromUTC,
  formatTimeString,
  formatTimeToUTC,
  formatUTCToLocalTimeString,
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

  it('createUTCDateWithTime returns original date when time is missing', () => {
    const input = new Date('2026-03-01T00:00:00.000Z');
    expect(createUTCDateWithTime(input, '')).toBe(input);
  });

  it('createUTCDateWithTime applies parsed time components', () => {
    const input = new Date('2026-03-01T00:00:00.000Z');
    const result = createUTCDateWithTime(input, '7:30 PM');

    expect(result.getHours()).toBe(19);
    expect(result.getMinutes()).toBe(30);
    expect(result.getSeconds()).toBe(0);
  });

  it.each([
    { label: 'missing time string', date: new Date('2026-03-01T00:00:00.000Z'), time: '', expected: '' },
    { label: 'valid timestamp output', date: new Date('2026-03-01T00:00:00.000Z'), time: '6:30 PM', expected: /2026-03-01T\d{2}:30:00.000Z/ },
  ])('formatTimeToUTC: $label', ({ date, time, expected }) => {
    const result = formatTimeToUTC(date, time);

    if (expected instanceof RegExp) {
      expect(result).toMatch(expected);
    } else {
      expect(result).toBe(expected);
    }
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

  it('createEveningAwareDateRange spans selected day through following UTC day', () => {
    const date = new Date('2026-10-31T12:00:00.000Z');
    const range = createEveningAwareDateRange(date);

    expect(range).toEqual({
      startDate: new Date('2026-10-31T00:00:00.000Z'),
      endDate: new Date('2026-11-01T23:59:59.000Z'),
    });
  });

  it('extractTimeSlotFromUTC returns exact slots when formatter output matches', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      function () {
        return buildDateTimeFormatResult('7:30 PM');
      } as unknown as typeof Intl.DateTimeFormat
    );

    expect(extractTimeSlotFromUTC('2026-03-01T00:00:00.000Z')).toBe('7:30 PM');
  });

  it.each([
    { formatted: '6:10 PM', expected: '6:00 PM' },
    { formatted: '6:40 PM', expected: '6:30 PM' },
    { formatted: '9:50 PM', expected: '10:00 PM' },
    { formatted: 'bad-data', expected: 'No Time' },
  ])('extractTimeSlotFromUTC normalization for $formatted', ({ formatted, expected }) => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      function () {
        return buildDateTimeFormatResult(formatted);
      } as unknown as typeof Intl.DateTimeFormat
    );

    expect(extractTimeSlotFromUTC(new Date('2026-03-01T00:00:00.000Z'))).toBe(expected);
  });

  it('formatUTCToLocalTimeString supports 24-hour and seconds options', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      function (_locales, options) {
        const formatted = options?.hour12 === false && options?.second === '2-digit' ? '19:30:00' : '7:30 PM';
        return buildDateTimeFormatResult(formatted);
      } as unknown as typeof Intl.DateTimeFormat
    );

    const date = new Date('2026-03-01T19:30:00.000Z');
    expect(formatUTCToLocalTimeString(date)).toBe('7:30 PM');
    expect(formatUTCToLocalTimeString(date, { use24Hour: true, includeSeconds: true })).toBe(
      '19:30:00'
    );
  });
});
