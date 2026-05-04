import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Team } from '@/types';

import {
  clearCompatibilityCache,
  clearMatchHistoryCache,
  getCachedCompatibilityScore,
  getCachedMatchHistory,
  getCacheKey,
} from '../cachingUtils';

function makeTeam(id: string): Team {
  return { id, name: `Team ${id}` } as Team;
}

describe('getCacheKey', () => {
  it('returns the same key regardless of team order', () => {
    expect(getCacheKey('a', 'b')).toBe(getCacheKey('b', 'a'));
  });

  it('returns different keys for different pairs', () => {
    expect(getCacheKey('a', 'b')).not.toBe(getCacheKey('a', 'c'));
  });
});

describe('getCachedCompatibilityScore', () => {
  beforeEach(() => {
    clearCompatibilityCache();
  });

  it('calls calculateFn on the first access', () => {
    const calculateFn = vi.fn().mockReturnValue(42);
    const t1 = makeTeam('1');
    const t2 = makeTeam('2');

    const result = getCachedCompatibilityScore(t1, t2, calculateFn);

    expect(result).toBe(42);
    expect(calculateFn).toHaveBeenCalledOnce();
  });

  it('returns the cached value without calling calculateFn again', () => {
    const calculateFn = vi.fn().mockReturnValue(99);
    const t1 = makeTeam('x');
    const t2 = makeTeam('y');

    getCachedCompatibilityScore(t1, t2, calculateFn);
    const second = getCachedCompatibilityScore(t1, t2, calculateFn);

    expect(second).toBe(99);
    expect(calculateFn).toHaveBeenCalledOnce();
  });

  it('hits the same cache for reversed team order', () => {
    const calculateFn = vi.fn().mockReturnValue(77);
    const t1 = makeTeam('p');
    const t2 = makeTeam('q');

    getCachedCompatibilityScore(t1, t2, calculateFn);
    getCachedCompatibilityScore(t2, t1, calculateFn);

    expect(calculateFn).toHaveBeenCalledOnce();
  });

  it('calls calculateFn again after clearCompatibilityCache', () => {
    const calculateFn = vi.fn().mockReturnValue(5);
    const t1 = makeTeam('m');
    const t2 = makeTeam('n');

    getCachedCompatibilityScore(t1, t2, calculateFn);
    clearCompatibilityCache();
    getCachedCompatibilityScore(t1, t2, calculateFn);

    expect(calculateFn).toHaveBeenCalledTimes(2);
  });
});

describe('getCachedMatchHistory', () => {
  beforeEach(() => {
    clearMatchHistoryCache();
  });

  it('calls checkFn on the first access', async () => {
    const checkFn = vi.fn().mockResolvedValue(true);
    const result = await getCachedMatchHistory('a', 'b', checkFn);
    expect(result).toBe(true);
    expect(checkFn).toHaveBeenCalledOnce();
  });

  it('returns the cached value without calling checkFn again', async () => {
    const checkFn = vi.fn().mockResolvedValue(false);
    await getCachedMatchHistory('c', 'd', checkFn);
    const second = await getCachedMatchHistory('c', 'd', checkFn);
    expect(second).toBe(false);
    expect(checkFn).toHaveBeenCalledOnce();
  });

  it('calls checkFn again after clearMatchHistoryCache', async () => {
    const checkFn = vi.fn().mockResolvedValue(true);
    await getCachedMatchHistory('e', 'f', checkFn);
    clearMatchHistoryCache();
    await getCachedMatchHistory('e', 'f', checkFn);
    expect(checkFn).toHaveBeenCalledTimes(2);
  });
});
