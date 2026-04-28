import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/timezone', () => ({
  extractTimeSlotFromUTC: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  timezoneLog: vi.fn(),
}));

import { timezoneLog } from '@/utils/logger';
import { extractTimeSlotFromUTC } from '@/utils/timezone';

import {
  extractTimeSlot,
  getTimeBlock,
  getTimePairForBlock,
  groupMatchesByTimeSlot,
  normalizeTimeFormat,
  testTimeConversion,
} from '../timeUtils';

const mockedExtractTimeSlotFromUTC = vi.mocked(extractTimeSlotFromUTC);
const mockedTimezoneLog = vi.mocked(timezoneLog);

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

  describe('normalizeTimeFormat', () => {
    it('returns empty string for empty input', () => {
      expect(normalizeTimeFormat('')).toBe('');
    });

    it('trims extra spaces and standardizes AM/PM spacing and casing', () => {
      expect(normalizeTimeFormat('   7:00PM   ')).toBe('7:00 PM');
      expect(normalizeTimeFormat('8:30am')).toBe('8:30 AM');
    });

    it.each([
      { input: '00:15', expected: '12:15 AM' },
      { input: '12:00', expected: '12:00 PM' },
      { input: '13:05', expected: '1:05 PM' },
      { input: '23:59', expected: '11:59 PM' },
    ])('converts 24-hour time $input to $expected', ({ input, expected }) => {
      expect(normalizeTimeFormat(input)).toBe(expected);
    });

    it('preserves current malformed-input behavior to avoid accidental breaking changes', () => {
      expect(normalizeTimeFormat('garbage')).toBe('garbage');
      expect(normalizeTimeFormat('ab:cd')).toBe('12:NaN AM');
    });
  });

  describe('getTimeBlock', () => {
    it.each([
      { input: '6:30 PM', expected: '6:30' },
      { input: '7:00 PM', expected: '6:30' },
      { input: '19:30', expected: '7:30' },
      { input: '8:00 PM', expected: '7:30' },
      { input: '20:30', expected: '8:30' },
      { input: '9:00 PM', expected: '8:30' },
    ])('maps $input to block $expected', ({ input, expected }) => {
      expect(getTimeBlock(input)).toBe(expected);
    });

    it('returns null for unmatched times', () => {
      expect(getTimeBlock('5:45 PM')).toBeNull();
      expect(getTimeBlock('22:15')).toBeNull();
    });
  });

  describe('getTimePairForBlock', () => {
    it('returns expected tuple for each known block', () => {
      expect(getTimePairForBlock('6:30')).toEqual(['6:30 PM', '7:00 PM']);
      expect(getTimePairForBlock('7:30')).toEqual(['7:30 PM', '8:00 PM']);
      expect(getTimePairForBlock('8:30')).toEqual(['8:30 PM', '9:00 PM']);
    });

    it('returns null for unknown block', () => {
      expect(getTimePairForBlock('10:00')).toBeNull();
    });
  });

  describe('extractTimeSlot', () => {
    it('delegates to extractTimeSlotFromUTC and returns its result', () => {
      mockedExtractTimeSlotFromUTC.mockReturnValue('7:30 PM');

      expect(extractTimeSlot('2026-05-01T19:30:00.000Z')).toBe('7:30 PM');
      expect(mockedExtractTimeSlotFromUTC).toHaveBeenCalledTimes(1);
      expect(mockedExtractTimeSlotFromUTC).toHaveBeenCalledWith('2026-05-01T19:30:00.000Z');
    });
  });

  describe('testTimeConversion', () => {
    it('logs start and conversion details for PM parsing branch', () => {
      testTimeConversion('7:15 PM');

      expect(mockedTimezoneLog).toHaveBeenCalledTimes(2);
      expect(mockedTimezoneLog).toHaveBeenNthCalledWith(
        1,
        'Testing time conversion for "7:15 PM":',
        expect.objectContaining({
          original: '7:15 PM',
          normalized: '7:15 PM',
        })
      );
      expect(mockedTimezoneLog).toHaveBeenNthCalledWith(
        2,
        'Conversion results:',
        expect.objectContaining({
          localTimeString: expect.any(String),
          localISOString: expect.any(String),
          directUTCISOString: expect.any(String),
          localHours: expect.any(Number),
          localMinutes: expect.any(Number),
          utcHours: expect.any(Number),
          utcMinutes: expect.any(Number),
          directUTCHours: expect.any(Number),
          directUTCMinutes: expect.any(Number),
        })
      );
    });

    it('covers AM parsing branch', () => {
      testTimeConversion('12:05 AM');

      expect(mockedTimezoneLog).toHaveBeenCalledTimes(2);
      expect(mockedTimezoneLog).toHaveBeenNthCalledWith(
        1,
        'Testing time conversion for "12:05 AM":',
        expect.objectContaining({
          original: '12:05 AM',
          normalized: '12:05 AM',
        })
      );
      expect(mockedTimezoneLog).toHaveBeenNthCalledWith(
        2,
        'Conversion results:',
        expect.objectContaining({
          localHours: expect.any(Number),
          localMinutes: expect.any(Number),
          directUTCHours: expect.any(Number),
          directUTCMinutes: expect.any(Number),
        })
      );
    });
  });
});
