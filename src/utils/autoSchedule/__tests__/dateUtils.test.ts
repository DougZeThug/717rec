import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  timezoneLog: vi.fn(),
}));

import {
  createSafeScheduleDate,
  normalizeScheduleDate,
  validateScheduleDate,
} from '../dateUtils';

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

describe('normalizeScheduleDate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a YYYY-MM-DD fallback for null', () => {
    expect(normalizeScheduleDate(null)).toMatch(DATE_FORMAT);
  });

  it('formats a Date object as YYYY-MM-DD', () => {
    const date = new Date(2025, 5, 15); // June 15, 2025 local time
    const result = normalizeScheduleDate(date);
    expect(result).toMatch(DATE_FORMAT);
    expect(result).toBe('2025-06-15');
  });

  it('extracts date part from ISO string', () => {
    expect(normalizeScheduleDate('2025-06-15T12:00:00.000Z')).toMatch(DATE_FORMAT);
  });

  it('returns fallback for invalid date string', () => {
    expect(normalizeScheduleDate('garbage')).toMatch(DATE_FORMAT);
  });
});

describe('validateScheduleDate', () => {
  it('returns false for null', () => {
    expect(validateScheduleDate(null)).toBe(false);
  });

  it('returns false for invalid Date', () => {
    expect(validateScheduleDate(new Date('invalid'))).toBe(false);
  });

  it('returns true for a valid Date', () => {
    expect(validateScheduleDate(new Date('2025-06-15'))).toBe(true);
  });
});

describe('createSafeScheduleDate', () => {
  it('returns a Date set to noon (hour 12)', () => {
    const input = new Date('2025-06-15T00:00:00');
    const result = createSafeScheduleDate(input);
    expect(result.getHours()).toBe(12);
  });

  it('does not mutate the input date', () => {
    const input = new Date('2025-06-15T08:00:00');
    createSafeScheduleDate(input);
    expect(input.getHours()).toBe(8);
  });

  it('preserves the date portion', () => {
    const input = new Date(2025, 5, 15); // June 15
    const result = createSafeScheduleDate(input);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(15);
  });
});
