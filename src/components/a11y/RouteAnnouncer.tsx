import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

import { LiveRegion } from '@/components/ui/live-region';
import { getRouteName } from '@/utils/routeName';

/**
 * Improves keyboard and screen-reader navigation on route changes:
 *  - announces the new page name through a visually-hidden ARIA live region.
 *
 * The very first render (initial page load) is skipped so we don't steal focus
 * or announce a page the user hasn't navigated to.
 */
export const RouteAnnouncer: React.FC = () => {
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

    // Derive the announcement from the route directly. Reading document.title
    // here is unreliable because react-helmet-async defers title updates to a
    // requestAnimationFrame, so this effect fires before the new title is
    // committed and would announce the previous page.
    setMessage(`${getRouteName(pathname)} page`);
  }, [pathname]);

  return <LiveRegion message={message} />;
};
