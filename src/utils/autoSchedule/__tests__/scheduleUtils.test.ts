import { describe, expect, it, vi } from 'vitest';

import { formatScheduleDate } from '../scheduleUtils';

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

describe('formatScheduleDate', () => {
  it('formats a UTC date for schedule display', () => {
    expect(formatScheduleDate(new Date('2026-04-28T23:30:00Z'))).toBe('Tuesday, April 28, 2026');
  });

  it('returns an empty string when no date is selected', () => {
    expect(formatScheduleDate(null)).toBe('');
  });
});
