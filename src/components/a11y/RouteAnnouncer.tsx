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
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setMessage(`${getRouteName(pathname)} page`);
    mainRef.current?.focus();
  }, [pathname, mainRef]);

  return <LiveRegion message={message} />;
};

export default RouteAnnouncer;
