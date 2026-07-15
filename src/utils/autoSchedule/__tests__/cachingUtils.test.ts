import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearMatchHistoryCache, getCachedMatchHistory, getCacheKey } from '../cachingUtils';

describe('getCacheKey', () => {
  it('returns the same key regardless of team order', () => {
    expect(getCacheKey('a', 'b')).toBe(getCacheKey('b', 'a'));
  });

  it('returns different keys for different pairs', () => {
    expect(getCacheKey('a', 'b')).not.toBe(getCacheKey('a', 'c'));
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
