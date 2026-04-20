import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  timezoneLog: vi.fn(),
}));

import { normalizeDate, normalizeDateWithTime } from '../dateNormalization';

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

describe('normalizeDate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a YYYY-MM-DD fallback for null', () => {
    const result = normalizeDate(null);
    expect(result).toMatch(DATE_FORMAT);
  });

  it('extracts YYYY-MM-DD from a Date object using UTC', () => {
    const date = new Date('2025-06-15T00:00:00.000Z');
    expect(normalizeDate(date)).toBe('2025-06-15');
  });

  it('extracts date part from ISO string', () => {
    expect(normalizeDate('2025-06-15T12:30:00.000Z')).toBe('2025-06-15');
  });

  it('returns unchanged YYYY-MM-DD string', () => {
    expect(normalizeDate('2025-03-20')).toBe('2025-03-20');
  });

  it('returns fallback for garbage string', () => {
    const result = normalizeDate('not-a-date');
    expect(result).toMatch(DATE_FORMAT);
  });
});

describe('normalizeDateWithTime', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns an ISO string fallback for null', () => {
    const result = normalizeDateWithTime(null);
    expect(result).toContain('T');
  });

  it('converts Date object to ISO string', () => {
    const date = new Date('2025-06-15T10:00:00.000Z');
    expect(normalizeDateWithTime(date)).toBe('2025-06-15T10:00:00.000Z');
  });

  it('returns ISO string unchanged', () => {
    const iso = '2025-06-15T12:30:00.000Z';
    expect(normalizeDateWithTime(iso)).toBe(iso);
  });

  it('appends T12:00:00.000Z to a plain date string', () => {
    expect(normalizeDateWithTime('2025-06-15')).toBe('2025-06-15T12:00:00.000Z');
  });
});
