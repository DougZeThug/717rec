import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

import { LiveRegion } from '@/components/ui/live-region';
import { getRouteName } from '@/utils/routeName';

interface RouteAnnouncerProps {
  /** Ref to the page's `<main>` element that should receive focus on navigation. */
  mainRef: React.RefObject<HTMLElement | null>;
}

/**
 * Improves keyboard and screen-reader navigation on route changes:
 *  - moves focus to the main content region so the next Tab starts inside the
 *    new page rather than back at the top of the browser chrome, and
 *  - announces the new page name through a visually-hidden ARIA live region.
 *
 * The very first render (initial page load) is skipped so we don't steal focus
 * or announce a page the user hasn't navigated to.
 */
export const RouteAnnouncer: React.FC<RouteAnnouncerProps> = ({ mainRef }) => {
  const location = useLocation();
  const pathname = location.pathname;
  const [message, setMessage] = useState('');
  // Track the last path we acted on rather than a one-way "first render" flag.
  // Comparing paths keeps the effect idempotent: re-running it without a real
  // navigation (e.g. React StrictMode's setup → cleanup → setup cycle) is a
  // no-op, so we never steal focus or announce on the initial page load.
  const lastAnnouncedPath = useRef(pathname);

  useEffect(() => {
    if (lastAnnouncedPath.current === pathname) {
      return;
    }
    lastAnnouncedPath.current = pathname;

    const announcement =
      (typeof document !== 'undefined' &&
        (document.title || document.querySelector('h1')?.textContent)) ||
      `${getRouteName(pathname)} page`;
    setMessage(announcement);
    mainRef.current?.focus();
  }, [pathname, mainRef]);

  return <LiveRegion message={message} />;
};

export default RouteAnnouncer;
