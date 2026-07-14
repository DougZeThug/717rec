import { describe, expect, it, vi } from 'vitest';

import { prefetchRoute, routePrefetchMap } from '../routePrefetch';

describe('routePrefetch', () => {
  it('exposes prefetch functions for every core route path', () => {
    const paths = [
      '/',
      '/teams',
      '/schedule',
      '/stats',
      '/playoffs',
      '/history',
      '/message-board',
      '/help',
      '/contact',
      '/admin',
      '/auth',
    ];
    for (const p of paths) {
      expect(typeof routePrefetchMap[p]).toBe('function');
    }
  });

  it('prefetchRoute invokes the mapped function for a known path', () => {
    const spy = vi.fn(() => Promise.resolve());
    const original = routePrefetchMap['/teams'];
    routePrefetchMap['/teams'] = spy;
    try {
      prefetchRoute('/teams');
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      routePrefetchMap['/teams'] = original;
    }
  });

  it('prefetchRoute is a no-op for unknown paths', () => {
    expect(() => prefetchRoute('/definitely-not-a-route')).not.toThrow();
  });
});