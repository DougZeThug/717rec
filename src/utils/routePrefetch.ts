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
export const preloadCoreRoutes = (): void => {
  const preload = () => {
    // Preload the most commonly visited pages
    prefetchRoutes.teams();
    prefetchRoutes.schedule();
    prefetchRoutes.stats();
    prefetchRoutes.playoffs();
    prefetchRoutes.history();
  };

  // Use requestIdleCallback to not block initial render
  if ('requestIdleCallback' in window) {
    requestIdleCallback(preload);
  } else {
    setTimeout(preload, 1000);
  }
};
