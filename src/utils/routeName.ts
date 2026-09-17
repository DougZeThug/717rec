/**
 * Maps a URL path to a friendly, human-readable page name.
 *
 * Used by the route announcer so screen-reader users hear which page they've
 * landed on after navigating. Keep the labels in sync with the routes declared
 * in `src/App.tsx`.
 */

// Exact-path matches, checked first.
const EXACT_ROUTE_NAMES: Record<string, string> = {
  '/': 'Home',
  '/teams': 'Teams',
  '/schedule': 'Schedule',
  '/stats': 'Standings',
  '/playoffs': 'Playoffs',
  '/history': 'History',
  '/admin': 'Admin Dashboard',
  '/auth': 'Sign In',
  '/forgot-password': 'Forgot Password',
  '/reset-password': 'Reset Password',
  '/setup-profile': 'Profile Setup',
  '/message-board': 'Message Board',
  '/my-team': 'My Team',
  '/help': 'Help',
  '/contact': 'Contact',
  '/compare': 'Compare',
  '/insights': 'Insights',
  '/oauth/consent': 'Authorize App',
};

// Dynamic routes, matched on shape rather than on a leading string. A bare
// prefix cannot tell a real address from one the router sends to the catch-all,
// so "/matches/123" — two segments where the route has three — used to be
// announced as "Live Scoring" while the screen read "Page Not Found".
const DYNAMIC_ROUTE_NAMES: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /^\/teams\/[^/]+$/, name: 'Team Details' },
  { pattern: /^\/matches\/[^/]+\/live$/, name: 'Live Scoring' },
  // Every admin section is its own address now, so without this the announcer
  // would read out "Page Not Found" on each switch inside the console.
  { pattern: /^\/admin\/[^/]+$/, name: 'Admin Dashboard' },
];

/**
 * Returns a friendly page name for the given pathname, falling back to
 * "Page Not Found" for anything unrecognized (mirrors the `*` route).
 */
export const getRouteName = (pathname: string): string => {
  // Normalize a trailing slash (except the root path) so "/teams/" matches "/teams".
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  const exact = EXACT_ROUTE_NAMES[normalized];
  if (exact) return exact;

  // Match the normalized path, not the raw one: "/matches/" would otherwise
  // still look like the start of a live-scoring address.
  const dynamicMatch = DYNAMIC_ROUTE_NAMES.find(({ pattern }) => pattern.test(normalized));
  if (dynamicMatch) return dynamicMatch.name;

  return 'Page Not Found';
};
