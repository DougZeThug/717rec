import { describe, expect, it } from 'vitest';

// Read as text through Vite rather than the filesystem: a static import needs no
// working directory, so the test does not care where vitest was started from.
import appSource from '@/App.tsx?raw';

import { getRouteName } from '../routeName';

describe('getRouteName', () => {
  it('maps known exact paths to friendly names', () => {
    expect(getRouteName('/')).toBe('Home');
    expect(getRouteName('/schedule')).toBe('Schedule');
    expect(getRouteName('/stats')).toBe('Standings');
    expect(getRouteName('/message-board')).toBe('Message Board');
  });

  it('ignores a trailing slash on non-root paths', () => {
    expect(getRouteName('/teams/')).toBe('Teams');
  });

  it('matches dynamic team detail routes by prefix', () => {
    expect(getRouteName('/teams/123')).toBe('Team Details');
    expect(getRouteName('/teams/abc-def')).toBe('Team Details');
  });

  it('names the consent route instead of announcing "Page Not Found"', () => {
    expect(getRouteName('/oauth/consent')).toBe('Authorize App');
  });

  it('names the live scoring route, which has a dynamic match id', () => {
    expect(getRouteName('/matches/123/live')).toBe('Live Scoring');
  });

  it('names every route declared in App.tsx', () => {
    // Rendered only when import.meta.env.DEV — an e2e harness, never a page a
    // league member can reach, so it needs no spoken name.
    const devOnly = ['/playoffs/e2e-bracket-proof'];

    const declared = [...appSource.matchAll(/path="([^"*]+)"/g)]
      .map((match) => match[1])
      .filter((path) => !devOnly.includes(path));

    // Without this the test passes vacuously if the source ever reads empty,
    // which is the one way a coverage check like this quietly stops working.
    expect(declared).toContain('/schedule');
    expect(declared.length).toBeGreaterThan(10);

    // A dynamic route is checked as a real address a user could be on. Skipping
    // them hid /matches/:matchId/live, which had no name at all.
    const sample = (path: string) => path.replace(/:[^/]+/g, 'sample-id');

    const unnamed = declared.filter((path) => getRouteName(sample(path)) === 'Page Not Found');
    expect(unnamed).toEqual([]);
  });

  it('falls back to "Page Not Found" for unknown paths', () => {
    expect(getRouteName('/does-not-exist')).toBe('Page Not Found');
  });
});
