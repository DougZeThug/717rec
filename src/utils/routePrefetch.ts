/**
 * Route prefetching utilities for faster page navigation
 * Preloads lazy-loaded page chunks to eliminate loading delays
 */

type RouteLoader = () => Promise<unknown>;

// Route path -> loader for that route's chunk. The app root hands the loaders
// over, so this util needs no knowledge of the pages themselves.
let routeLoaders: Record<string, RouteLoader> = {};

/**
 * Hand over the route-to-loader map. Register once, when the app module loads
 * and before any render, so no prefetch can run before the map is in place.
 */
export const registerRoutePrefetchers = (loaders: Record<string, RouteLoader>): void => {
  routeLoaders = loaders;
};

/**
 * A prefetch is a nicety, so nothing waits on it and nothing reports it: a
 * chunk that fails to arrive is fetched again by the real navigation, and the
 * route error boundary owns a genuine failure. Swallowing the rejection is what
 * keeps a dropped connection from raising an unhandled promise rejection.
 */
const ignorePrefetchFailure = (loading: Promise<unknown>): void => {
  loading.catch(() => undefined);
};

// Prefetch a route by path
export const prefetchRoute = (path: string): void => {
  const prefetch = routeLoaders[path];
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
    prefetchRoute('/teams');
    prefetchRoute('/schedule');
    prefetchRoute('/history');
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
