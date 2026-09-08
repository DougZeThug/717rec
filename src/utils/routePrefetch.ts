/**
 * Route prefetching utilities for faster page navigation
 * Preloads lazy-loaded page chunks to eliminate loading delays
 */

// Prefetch functions matching lazy imports in App.tsx
const prefetchRoutes = {
  index: () => import('../pages/Index'),
  teams: () => import('../pages/TeamsPage'),
  teamDetails: () => import('../pages/TeamDetails'),
  schedule: () => import('../pages/Schedule'),
  stats: () => import('../pages/Stats'),
  playoffs: () => import('../pages/Playoffs'),
  history: () => import('../pages/History'),
  messageBoard: () => import('../pages/MessageBoard'),
  help: () => import('../pages/Help'),
  contact: () => import('../pages/Contact'),
  admin: () => import('../pages/AdminDashboard'),
  auth: () => import('../pages/Auth'),
} as const;

// Map routes to prefetch functions
const routePrefetchMap: Record<string, () => Promise<unknown>> = {
  '/': prefetchRoutes.index,
  '/teams': prefetchRoutes.teams,
  '/schedule': prefetchRoutes.schedule,
  '/stats': prefetchRoutes.stats,
  '/playoffs': prefetchRoutes.playoffs,
  '/history': prefetchRoutes.history,
  '/message-board': prefetchRoutes.messageBoard,
  '/help': prefetchRoutes.help,
  '/contact': prefetchRoutes.contact,
  '/admin': prefetchRoutes.admin,
  '/auth': prefetchRoutes.auth,
};

/**
 * A prefetch is a nicety, so nothing waits on it and nothing reports it: a
 * chunk that fails to arrive is fetched again by the real navigation, and the
 * route error boundary owns a genuine failure. Swallowing the rejection is what
 * keeps a dropped connection from raising an unhandled promise rejection.
 */
const ignorePrefetchFailure = (loading: Promise<unknown>): void => {
  void loading.catch(() => undefined);
};

// Prefetch a route by path
export const prefetchRoute = (path: string): void => {
  const prefetch = routePrefetchMap[path];
  if (prefetch) {
    ignorePrefetchFailure(prefetch());
  }
};

// Preload core navigation pages after initial render
// NOTE: Only preload lightweight pages to avoid loading heavy chunks (recharts, brackets)
// that hurt TTI and increase unused JavaScript on initial load
export const preloadCoreRoutes = (): void => {
  /** Import the lightweight Teams, Schedule, and History page chunks ahead of navigation. */
  const preloadLight = () => {
    // Only preload pages with minimal dependencies
    ignorePrefetchFailure(prefetchRoutes.teams());
    ignorePrefetchFailure(prefetchRoutes.schedule());
    ignorePrefetchFailure(prefetchRoutes.history());
  };

  // Use requestIdleCallback to not block initial render
  // Only preload lightweight pages - heavy pages (stats, playoffs) are NOT preloaded
  // to reduce unused JavaScript and improve TTI
  if ('requestIdleCallback' in window) {
    requestIdleCallback(preloadLight, { timeout: 3000 });
  } else {
    setTimeout(preloadLight, 2000);
  }
};
