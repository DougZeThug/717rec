import { describe, expect, it, vi } from 'vitest';

import { formatScheduleDate } from '../scheduleUtils';

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

describe('formatScheduleDate', () => {
  it('formats a UTC date for schedule display', () => {
    // Use noon UTC so the UTC date components (which formatScheduleDate
    // extracts) map to April 28 regardless of the runner's local timezone.
    expect(formatScheduleDate(new Date('2026-04-28T12:00:00Z'))).toBe('Tuesday, April 28, 2026');
  });

  it('returns an empty string when no date is selected', () => {
    expect(formatScheduleDate(null)).toBe('');
  });
});
