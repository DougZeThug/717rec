import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prefetchRoute } from '../routePrefetch';

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

  // A prefetch is fire-and-forget, so a chunk that fails to load — offline, or
  // in a test whose environment is torn down before the import settles — used
  // to surface as an unhandled rejection with nobody to catch it.
  it('swallows a chunk that fails to load', async () => {
    prefetchRoute('/teams');

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(unhandled).not.toHaveBeenCalled();
  });
});
