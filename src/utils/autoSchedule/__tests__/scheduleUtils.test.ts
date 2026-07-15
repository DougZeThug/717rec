import { describe, expect, it, vi } from 'vitest';

import type { TimeBlockTeamsMap } from '@/types/autoSchedule';

vi.mock('../qualityAnalysis', () => ({
  calculateComprehensiveQualityMetrics: vi.fn(() => ({ score: 42, breakdown: {} })),
}));

import { analyzeMatchQuality, formatScheduleDate, getTimeBlocksStatistics } from '../scheduleUtils';

describe('formatScheduleDate', () => {
  it('returns empty string for null', () => {
    expect(formatScheduleDate(null)).toBe('');
  });

  it('formats a UTC-normalized date as "EEEE, MMMM d, yyyy"', () => {
    // 2026-03-14 is a Saturday
    const d = new Date(Date.UTC(2026, 2, 14));
    expect(formatScheduleDate(d)).toBe('Saturday, March 14, 2026');
  });
});

describe('getTimeBlocksStatistics', () => {
  it('returns zeros for empty map', () => {
    expect(getTimeBlocksStatistics({})).toEqual({ total: 0, odd: 0 });
  });

  it('counts total teams and odd blocks', () => {
    const map = {
      Early: ['t1', 't2', 't3'], // odd
      Late: ['t4', 't5'], // even
      Night: ['t6'], // odd
    } as unknown as TimeBlockTeamsMap;
    expect(getTimeBlocksStatistics(map)).toEqual({ total: 6, odd: 2 });
  });
});

describe('analyzeMatchQuality', () => {
  it('delegates to calculateComprehensiveQualityMetrics', () => {
    const result = analyzeMatchQuality({} as never);
    expect(result).toEqual({ score: 42, breakdown: {} });
  });
});
