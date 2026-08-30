import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';

/**
 * Scrolls to the top of the page when the route changes.
 *
 * React Router does not do this by itself, and `<ScrollRestoration>` is not
 * available here because the app uses `<BrowserRouter>` rather than a data
 * router. Without it a user who is scrolled down and follows a link lands part
 * way down the new page — often below all of its content, so it looks blank.
 *
 * Two deliberate limits, matching RouteFocusManager:
 *
 * - POP navigations are skipped, so the browser and `useScrollRestoration` can
 *   put the user back where they were. A plain effect would fire on commit and
 *   beat that hook, which defers through a frame and then retries while the
 *   content loads.
 * - Only `pathname` is watched, never the whole location. Several pages call
 *   `setSearchParams(..., { replace: true })` from an effect — Compare does it
 *   on every team you pick — which mints a new location on the same page.
 *   Reacting to that would yank the user to the top mid-interaction.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const lastPath = useRef(pathname);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    if (navigationType === 'POP') return;

    // Instant, not smooth: gliding up from a deep scroll on a route change
    // reads as a bug rather than a transition.
    window.scrollTo(0, 0);
  }, [navigationType, pathname]);

  return null;
};
