import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/timezone/formatters', () => ({
  extractTimeSlotFromUTC: vi.fn((date: string) => (date.includes('10:00') ? '10:00 AM' : '2:00 PM')),
}));

vi.mock('@/utils/logger', () => ({
  matchLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { groupMatchesByTimeSlot, sortTimeSlots } from '../timeGrouping';

describe('timeGrouping helpers', () => {
  it('groups matches by timeslot and handles no-time entries', () => {
    const grouped = groupMatchesByTimeSlot([
      { id: 'm1', date: '2026-02-01T10:00:00.000Z' } as any,
      { id: 'm2', date: '2026-02-01T14:00:00.000Z' } as any,
      { id: 'm3' } as any,
    ]);

    expect(grouped['10:00 AM']).toHaveLength(1);
    expect(grouped['2:00 PM']).toHaveLength(1);
    expect(grouped['No Time']).toHaveLength(1);
    expect(grouped['No Time'][0].id).toContain('index-2');
  });

  it('sorts time slots chronologically with No Time last', () => {
    expect(sortTimeSlots(['No Time', '2:00 PM', '10:00 AM'])).toEqual([
      '10:00 AM',
      '2:00 PM',
      'No Time',
    ]);
  });
});
