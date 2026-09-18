import { matchRoutes } from 'react-router';
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

  it('matches dynamic team detail routes by shape', () => {
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

    // These render nothing of their own: they redirect straight to /admin, so
    // the name the announcer speaks is that of the page actually landed on.
    const redirectOnly = ['/timeslots', '/admin/notifications'];

    const skipped = [...devOnly, ...redirectOnly];

    const declared = [...appSource.matchAll(/path="([^"*]+)"/g)]
      .map((match) => match[1])
      .filter((path) => !skipped.includes(path));

    // Without this the test passes vacuously if the source ever reads empty,
    // which is the one way a coverage check like this quietly stops working.
    expect(declared).toContain('/schedule');
    expect(declared.length).toBeGreaterThan(10);

    // A dynamic route is checked as a real address a user could be on. Skipping
    // them hid /matches/:matchId/live, which had no name at all.
    //
    // Most segments accept anything, so a placeholder stands in. A few have a
    // shape the route name matches on, and those need a realistic sample —
    // otherwise the only way to pass would be to loosen the name matching until
    // it labelled addresses that actually render Page Not Found.
    const segmentSamples: Record<string, string> = { ':week': 'week-6' };
    const sample = (path: string) =>
      path.replace(/:[^/]+/g, (segment) => segmentSamples[segment] ?? 'sample-id');

    const unnamed = declared.filter((path) => getRouteName(sample(path)) === 'Page Not Found');
    expect(unnamed).toEqual([]);
  });

  it('falls back to "Page Not Found" for unknown paths', () => {
    expect(getRouteName('/does-not-exist')).toBe('Page Not Found');
  });

  // A dynamic route has a shape, not just a first segment. Matching on the
  // first segment alone named four kinds of address the router 404s, so a
  // screen-reader user heard "Live Scoring page" on a page headed "Page Not
  // Found".
  it.each([
    ['/matches/123', 'two segments where /matches/:matchId/live has three'],
    ['/matches/', 'no match id at all'],
    ['/matches/123/live/extra', 'a segment past the live one'],
    ['/admin/scores/extra', 'a segment past the section'],
    ['/teams/abc/def', 'a segment past the team'],
  ])('says "Page Not Found" for %s, which has %s', (path) => {
    expect(getRouteName(path)).toBe('Page Not Found');
  });
});

// The announcer and the router must agree: whatever the router sends to its
// catch-all is a page headed "Page Not Found", so that is what must be spoken.
// Both halves are read from App.tsx rather than typed out here, so a new route
// cannot pass this by being forgotten.
describe('getRouteName agrees with the router in App.tsx', () => {
  // Rendered only when import.meta.env.DEV, and a plain redirect: neither is a
  // page a league member lands on, so neither needs a spoken name.
  const skipped = ['/playoffs/e2e-bracket-proof', '/timeslots', '/admin/notifications'];

  const declared = [...appSource.matchAll(/path="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => !skipped.includes(path));

  // Without this the test passes vacuously if the source ever reads empty.
  expect(declared).toContain('*');
  expect(declared.length).toBeGreaterThan(10);

  const routes = declared.map((path) => ({ path }));
  const resolves = (path: string) => {
    const matched = matchRoutes(routes, path);
    return matched ? matched[matched.length - 1].route.path : null;
  };

  it.each([
    '/matches/123',
    '/matches/',
    '/matches/123/live/extra',
    '/admin/scores/extra',
    '/teams/abc/def',
    '/does-not-exist',
    '/teams/a/b/c',
  ])('%s reaches the catch-all, so it is named "Page Not Found"', (path) => {
    expect(resolves(path)).toBe('*');
    expect(getRouteName(path)).toBe('Page Not Found');
  });

  it.each([
    ['/matches/sample-id/live', '/matches/:matchId/live', 'Live Scoring'],
    ['/admin/scores', '/admin/:section', 'Admin Dashboard'],
    ['/teams/sample-slug', '/teams/:teamId', 'Team Details'],
    ['/oauth/consent', '/oauth/consent', 'Authorize App'],
    ['/teams', '/teams', 'Teams'],
  ])('%s is a real route, so it keeps its name', (path, route, name) => {
    expect(resolves(path)).toBe(route);
    expect(getRouteName(path)).toBe(name);
  });
});

// Every admin section is its own address now. Without a prefix entry the
// announcer would tell a screen-reader user "Page Not Found" on each switch.
describe('admin section addresses', () => {
  it('names every admin section address as the dashboard', () => {
    expect(getRouteName('/admin')).toBe('Admin Dashboard');
    expect(getRouteName('/admin/scores')).toBe('Admin Dashboard');
    expect(getRouteName('/admin/pending-matches')).toBe('Admin Dashboard');
  });
});
