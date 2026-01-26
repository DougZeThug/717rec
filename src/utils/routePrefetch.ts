/**
 * Route prefetching utilities for faster page navigation
 * Preloads lazy-loaded page chunks to eliminate loading delays
 */

// Prefetch functions matching lazy imports in App.tsx
export const prefetchRoutes = {
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
export const routePrefetchMap: Record<string, () => Promise<unknown>> = {
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

// Prefetch a route by path
export const prefetchRoute = (path: string): void => {
  const prefetch = routePrefetchMap[path];
  if (prefetch) {
    prefetch();
  }
};

// Preload core navigation pages after initial render
// NOTE: Only preload lightweight pages to avoid loading heavy chunks (recharts, brackets)
// that hurt TTI and increase unused JavaScript on initial load
export const preloadCoreRoutes = (): void => {
  const preloadLight = () => {
    // Only preload pages with minimal dependencies
    prefetchRoutes.teams();
    prefetchRoutes.schedule();
    prefetchRoutes.history();
  };

  // Defer heavy pages even further
  const preloadHeavy = () => {
    // These have large dependencies (recharts, brackets-manager)
    // Only preload after page is fully interactive
    prefetchRoutes.stats();
    prefetchRoutes.playoffs();
  };

  // Use requestIdleCallback to not block initial render
  if ('requestIdleCallback' in window) {
    requestIdleCallback(preloadLight, { timeout: 2000 });
    // Defer heavy chunks until truly idle (after 5 seconds)
    requestIdleCallback(preloadHeavy, { timeout: 8000 });
  } else {
    setTimeout(preloadLight, 1000);
    setTimeout(preloadHeavy, 5000);
  }
};
