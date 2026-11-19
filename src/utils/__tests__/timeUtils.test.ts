import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/timezone', () => ({
  extractTimeSlotFromUTC: vi.fn(),
}));

import { extractTimeSlotFromUTC } from '@/utils/timezone';

import { groupMatchesByTimeSlot } from '../timeUtils';

const mockedExtractTimeSlotFromUTC = vi.mocked(extractTimeSlotFromUTC);

describe('timeUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('groupMatchesByTimeSlot', () => {
    it('groups matches by extracted time slots and falls back to "No Time" when date is missing', () => {
      mockedExtractTimeSlotFromUTC.mockImplementation((date) =>
        String(date).includes('19:00') ? '7:00 PM' : '8:30 PM'
      );

      const matchWithEarlyTime = { id: 'm1', date: '2026-05-01T19:00:00.000Z' };
      const matchWithLateTime = { id: 'm2', date: '2026-05-01T20:30:00.000Z' };
      const matchWithoutDate = { id: 'm3' };

      const result = groupMatchesByTimeSlot([
        matchWithEarlyTime as never,
        matchWithLateTime as never,
        matchWithoutDate as never,
      ]);

      expect(result).toEqual({
        '7:00 PM': [matchWithEarlyTime],
        '8:30 PM': [matchWithLateTime],
        'No Time': [matchWithoutDate],
      });
      expect(mockedExtractTimeSlotFromUTC).toHaveBeenCalledTimes(2);
      expect(mockedExtractTimeSlotFromUTC).toHaveBeenNthCalledWith(1, '2026-05-01T19:00:00.000Z');
      expect(mockedExtractTimeSlotFromUTC).toHaveBeenNthCalledWith(2, '2026-05-01T20:30:00.000Z');
    });

    it('returns an empty object for empty input', () => {
      expect(groupMatchesByTimeSlot([])).toEqual({});
      expect(mockedExtractTimeSlotFromUTC).not.toHaveBeenCalled();
    });
  });
});
