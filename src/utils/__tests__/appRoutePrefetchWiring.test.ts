import { describe, expect, it } from 'vitest';

// Read as text through Vite rather than the filesystem, the same way
// `routeName.test.ts` does: a static import needs no working directory, so the
// test does not care where vitest was started from.
import appSource from '@/App.tsx?raw';
import routePrefetchSource from '@/utils/routePrefetch.ts?raw';

/**
 * Which page each prefetch route loads, pinned.
 *
 * `App.tsx` hands one loader per nav-link page to `registerRoutePrefetchers`,
 * and the page's `lazy(...)` line uses the same loader. The unit test for
 * `routePrefetch.ts` proves the lookup and the timing, but it feeds the util its
 * own fake loaders, so it cannot see a swapped pair in `App.tsx`. Swap two
 * pages there and hovering Standings would quietly fetch Playoffs instead.
 *
 * The wiring is read from the `App.tsx` text with small patterns. If a pattern
 * stops matching, the "reads the wiring" test fails first, so a change in
 * layout cannot make the rest pass by finding nothing.
 */

// The one table to edit when a route gains or loses prefetching.
//   route:  the address a nav link points at
//   loader: the helper in App.tsx that imports the page
//   page:   the file under src/pages/ the helper must import (also the name of
//           the lazy page component)
const wiring = [
  { route: '/', loader: 'loadIndex', page: 'Index' },
  { route: '/teams', loader: 'loadTeamsPage', page: 'TeamsPage' },
  { route: '/schedule', loader: 'loadSchedule', page: 'Schedule' },
  { route: '/stats', loader: 'loadStats', page: 'Stats' },
  { route: '/playoffs', loader: 'loadPlayoffs', page: 'Playoffs' },
  { route: '/history', loader: 'loadHistory', page: 'History' },
  { route: '/compare', loader: 'loadCompare', page: 'Compare' },
  { route: '/insights', loader: 'loadInsights', page: 'Insights' },
  { route: '/message-board', loader: 'loadMessageBoard', page: 'MessageBoard' },
  { route: '/help', loader: 'loadHelp', page: 'Help' },
  { route: '/contact', loader: 'loadContact', page: 'Contact' },
  { route: '/admin', loader: 'loadAdminDashboard', page: 'AdminDashboard' },
  { route: '/auth', loader: 'loadAuth', page: 'Auth' },
];

// registerRoutePrefetchers({ '/stats': loadStats, ... }) as [route, loader] pairs.
// Pairs, not an object, so a route written twice still shows up twice.
const registerCalls = [...appSource.matchAll(/registerRoutePrefetchers\(\{([^}]*)\}\)/g)];
const registered = [...(registerCalls[0]?.[1] ?? '').matchAll(/'([^']+)':\s*(\w+)/g)].map(
  (match) => [match[1], match[2]] as const
);

// Every `const loadX = ...;` line in App.tsx, as [loader name, what it is set to].
const loaderLines = [...appSource.matchAll(/^const (load\w+) = (.+);$/gm)].map(
  (match) => [match[1], match[2]] as const
);

// Every `const Page = lazy(...);` line in App.tsx, as [page name, what it is given].
const lazyLines = [...appSource.matchAll(/^const (\w+) = lazy\((.+)\);$/gm)].map(
  (match) => [match[1], match[2]] as const
);

const inApp = (text: string) => appSource.split(text).length - 1;

describe('App.tsx route prefetch wiring', () => {
  it('reads the wiring out of App.tsx', () => {
    // Without this the checks below pass vacuously if App.tsx is ever laid out
    // differently, which is the one way a text check quietly stops working.
    expect(registerCalls).toHaveLength(1);
    expect(registered.length).toBeGreaterThan(10);
    expect(loaderLines.length).toBeGreaterThan(10);
    expect(lazyLines.length).toBeGreaterThan(10);
  });

  it('registers exactly the routes in the table, each once', () => {
    const routes = registered.map(([route]) => route).sort();
    const expected = wiring.map(({ route }) => route).sort();

    expect(routes).toEqual(expected);
  });

  it.each(wiring)('$route is registered with $loader', ({ route, loader }) => {
    const pair = registered.find(([key]) => key === route);

    expect(pair?.[1], `${route} must be registered with ${loader}`).toBe(loader);
  });

  it.each(wiring)(
    '$loader is defined once, and imports only the $page page',
    ({ loader, page }) => {
      const definitions = loaderLines.filter(([name]) => name === loader).map(([, value]) => value);

      expect(definitions, `${loader} must be defined exactly once`).toEqual([
        `() => import('./pages/${page}')`,
      ]);
    }
  );

  it.each(wiring)('no other line in App.tsx imports the $page page', ({ page }) => {
    const imports = inApp(`import('./pages/${page}')`);

    expect(imports, `only the loader may import ./pages/${page}`).toBe(1);
  });

  it.each(wiring)('the $page page is lazy-loaded through $loader', ({ loader, page }) => {
    const lazyArguments = lazyLines.filter(([name]) => name === page).map(([, value]) => value);

    expect(
      lazyArguments,
      `${page} must be lazy(${loader}), so lazy loading and prefetch share one loader`
    ).toEqual([loader]);
  });

  it('defines no loader that the table does not list', () => {
    const defined = loaderLines.map(([name]) => name).sort();
    const expected = wiring.map(({ loader }) => loader).sort();

    expect(defined).toEqual(expected);
  });
});

describe('routePrefetch.ts', () => {
  // The util must stay ignorant of the pages. If it imported one itself, that
  // page would load from two places and the app root would no longer be the
  // single place that says which page each route is.
  it('does not import any page', () => {
    expect(routePrefetchSource).not.toMatch(/\bimport\s*\(/);
    expect(routePrefetchSource).not.toContain('pages/');
  });
});
