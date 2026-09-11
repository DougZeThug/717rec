import { describe, expect, it } from 'vitest';

import { isChunkLoadError } from '../chunkLoadError';

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://717rec.app/assets/Stats-a1b2c3.js',
    'error loading dynamically imported module: /assets/Schedule.js',
    'Importing a module script failed.',
    'Loading chunk vendor-react failed.',
  ])('recognises %s', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it('recognises the older bundler error by its name', () => {
    const error = new Error('anything at all');
    error.name = 'ChunkLoadError';
    expect(isChunkLoadError(error)).toBe(true);
  });

  it('leaves an ordinary application error alone', () => {
    expect(isChunkLoadError(new Error('Failed to fetch match data'))).toBe(false);
  });

  it('is false for anything that is not an error', () => {
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    // `error` is a required parameter, so the undefined case must be explicit.
    expect(isChunkLoadError(undefined)).toBe(false); // skipcq: JS-W1042
  });
});
