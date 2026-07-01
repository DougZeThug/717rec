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
  '/timeslots': 'Timeslots',
  '/admin': 'Admin Dashboard',
  '/admin/notifications': 'Admin Notifications',
  '/auth': 'Sign In',
  '/setup-profile': 'Profile Setup',
  '/message-board': 'Message Board',
  '/my-team': 'My Team',
  '/help': 'Help',
  '/contact': 'Contact',
  '/compare': 'Compare',
  '/insights': 'Insights',
};

// Prefix matches for dynamic routes, checked after exact matches.
const PREFIX_ROUTE_NAMES: Array<{ prefix: string; name: string }> = [
  { prefix: '/teams/', name: 'Team Details' },
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

  const prefixMatch = PREFIX_ROUTE_NAMES.find(({ prefix }) => pathname.startsWith(prefix));
  if (prefixMatch) return prefixMatch.name;

  return 'Page Not Found';
};
