import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prefetchRoute, preloadCoreRoutes, registerRoutePrefetchers } from '../routePrefetch';

// Every route the nav links can prefetch. App.tsx registers one loader for each.
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

// The three light pages the idle preload fetches, and nothing else.
const PRELOADED_ROUTES = { '/teams': 1, '/schedule': 1, '/history': 1 };

const IDLE_DEADLINE = { didTimeout: false, timeRemaining: () => 50 } as IdleDeadline;

type FakeLoader = Mock<() => Promise<unknown>>;

/**
 * A loader whose chunk never arrives, and a count of how often it was asked.
 * A plain function, not a vi.fn: a spy attaches its own handler to the promise
 * it returns, which would hide the unhandled rejection these tests look for.
 */
const makeFailingLoader = () => {
  const state = { calls: 0 };
  const load = (): Promise<unknown> => {
    state.calls += 1;
    return Promise.reject(new Error('chunk failed to load'));
  };
  return { load, state };
};

/** One spy per route, registered the way App.tsx registers the real loaders. */
const registerFakeLoaders = (): Record<string, FakeLoader> => {
  const loaders: Record<string, FakeLoader> = Object.fromEntries(
    MAPPED_ROUTES.map((route) => [route, vi.fn(() => Promise.resolve({}))])
  );
  registerRoutePrefetchers(loaders);
  return loaders;
};

/** Which loaders ran, and how often. Loaders that never ran are left out. */
const callCounts = (loaders: Record<string, FakeLoader>): Record<string, number> =>
  Object.fromEntries(
    Object.entries(loaders)
      .filter(([, loader]) => loader.mock.calls.length > 0)
      .map(([route, loader]) => [route, loader.mock.calls.length])
  );

const unhandled = vi.fn();

beforeEach(() => {
  unhandled.mockClear();
  process.on('unhandledRejection', unhandled);
});

afterEach(() => {
  process.off('unhandledRejection', unhandled);
  // The registry is module state and outlives a test: empty it each time.
  registerRoutePrefetchers({});
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// Keep this first. A fresh copy of the module is loaded, so what it proves does
// not depend on test order: no loader has been registered yet.
describe('before the app registers its loaders', () => {
  it('does nothing and throws nothing', async () => {
    vi.resetModules();
    const fresh = await import('../routePrefetch');
    vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) => {
      callback(IDLE_DEADLINE);
      return 1;
    });

    expect(() => fresh.prefetchRoute('/teams')).not.toThrow();
    expect(() => fresh.preloadCoreRoutes()).not.toThrow();
  });
});

describe('prefetchRoute', () => {
  it('does nothing for a path with no chunk behind it', () => {
    const loaders = registerFakeLoaders();

    expect(() => prefetchRoute('/nothing-here')).not.toThrow();
    expect(callCounts(loaders)).toEqual({});
  });

  // Each route must start its own page and no other. This pins the lookup, not
  // the wiring in App.tsx, which decides what each loader imports.
  it.each(MAPPED_ROUTES)('starts the chunk load for %s, and only that one', (route) => {
    const loaders = registerFakeLoaders();

    prefetchRoute(route);

    expect(callCounts(loaders)).toEqual({ [route]: 1 });
  });

  // A prefetch is fire-and-forget, so a chunk that fails to load — offline, or
  // in a test whose environment is torn down before the import settles — used
  // to surface as an unhandled rejection with nobody to catch it.
  it('swallows a chunk that fails to load', async () => {
    const failing = makeFailingLoader();
    registerRoutePrefetchers({ '/teams': failing.load });

    expect(() => prefetchRoute('/teams')).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(failing.state.calls).toBe(1);
    expect(unhandled).not.toHaveBeenCalled();
  });
});

describe('preloadCoreRoutes', () => {
  it('preloads the three light pages when the browser goes idle', () => {
    const loaders = registerFakeLoaders();
    const queued: IdleRequestCallback[] = [];
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      queued.push(callback);
      return 1;
    });
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);

    preloadCoreRoutes();

    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 3000 });
    // Nothing loads until the browser has a free moment.
    expect(callCounts(loaders)).toEqual({});

    queued.forEach((run) => run(IDLE_DEADLINE));

    // Stats and Playoffs are heavy, so they stay out of the preload.
    expect(callCounts(loaders)).toEqual(PRELOADED_ROUTES);
  });

  // Safari had no requestIdleCallback for years; the timer is the fallback.
  it('falls back to a timer where requestIdleCallback is missing', () => {
    const loaders = registerFakeLoaders();
    vi.useFakeTimers();
    const original = Reflect.get(window, 'requestIdleCallback');
    Reflect.deleteProperty(window, 'requestIdleCallback');

    try {
      preloadCoreRoutes();
      vi.advanceTimersByTime(1999);
      expect(callCounts(loaders)).toEqual({});

      vi.advanceTimersByTime(1);
      expect(callCounts(loaders)).toEqual(PRELOADED_ROUTES);
    } finally {
      if (original) Reflect.set(window, 'requestIdleCallback', original);
    }
  });

  it('swallows a preloaded chunk that fails to load', async () => {
    const failing = makeFailingLoader();
    registerRoutePrefetchers({
      '/teams': failing.load,
      '/schedule': failing.load,
      '/history': failing.load,
    });
    vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) => {
      callback(IDLE_DEADLINE);
      return 1;
    });

    expect(() => preloadCoreRoutes()).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(failing.state.calls).toBe(3);
    expect(unhandled).not.toHaveBeenCalled();
  });
});
