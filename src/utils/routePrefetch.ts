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

  // Use requestIdleCallback to not block initial render
  // Only preload lightweight pages - heavy pages (stats, playoffs) are NOT preloaded
  // to reduce unused JavaScript and improve TTI
  if ('requestIdleCallback' in window) {
    requestIdleCallback(preloadLight, { timeout: 3000 });
  } else {
    setTimeout(preloadLight, 2000);
  }
};

// Prefetch heavy routes on-demand (e.g., on hover/focus)
// This avoids loading unused JavaScript on initial page load
export const prefetchHeavyRoute = (route: 'stats' | 'playoffs'): void => {
  if (route === 'stats') {
    prefetchRoutes.stats();
  } else if (route === 'playoffs') {
    prefetchRoutes.playoffs();
  }
};
