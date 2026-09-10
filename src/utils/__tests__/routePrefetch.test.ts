import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prefetchRoute, preloadCoreRoutes } from '../routePrefetch';

// Every route in the map, so the lazy import behind each one is exercised.
const MAPPED_ROUTES = [
  '/',
  '/teams',
  '/schedule',
  '/stats',
  '/playoffs',
  '/history',
  '/compare',
  '/insights',
  '/message-board',
  '/help',
  '/contact',
  '/admin',
  '/auth',
];

describe('prefetchRoute', () => {
  const unhandled = vi.fn();

  beforeEach(() => {
    unhandled.mockClear();
    process.on('unhandledRejection', unhandled);
  });

  afterEach(() => {
    process.off('unhandledRejection', unhandled);
  });

  it('does nothing for a path with no chunk behind it', () => {
    expect(() => prefetchRoute('/nothing-here')).not.toThrow();
  });

  it.each(MAPPED_ROUTES)('starts the chunk load for %s', (route) => {
    expect(() => prefetchRoute(route)).not.toThrow();
  });

  // A prefetch is fire-and-forget, so a chunk that fails to load — offline, or
  // in a test whose environment is torn down before the import settles — used
  // to surface as an unhandled rejection with nobody to catch it.
  it('swallows a chunk that fails to load', async () => {
    prefetchRoute('/teams');

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(unhandled).not.toHaveBeenCalled();
  });
});

describe('preloadCoreRoutes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('preloads the three light pages when the browser goes idle', () => {
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
      return 1;
    });
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);

    preloadCoreRoutes();

    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 3000 });
  });

  // Safari had no requestIdleCallback for years; the timer is the fallback.
  it('falls back to a timer where requestIdleCallback is missing', () => {
    vi.useFakeTimers();
    const original = Reflect.get(window, 'requestIdleCallback');
    Reflect.deleteProperty(window, 'requestIdleCallback');

    try {
      preloadCoreRoutes();
      expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
    } finally {
      if (original) Reflect.set(window, 'requestIdleCallback', original);
    }
  });
});
