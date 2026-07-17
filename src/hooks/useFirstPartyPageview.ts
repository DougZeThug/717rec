import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

import { classifyUserAgent, sendFirstPartyPageview } from '@/utils/firstPartyPageview';

const DEDUPE_WINDOW_MS = 500;

/**
 * Fires one first-party pageview per route change. Dedupes rapid double-fires
 * (e.g. React 18 StrictMode double-invoke, quick redirects) that would
 * otherwise inflate the count. Mount once, at the router root.
 */
export const useFirstPartyPageview = (): void => {
  const location = useLocation();
  const pathname = location.pathname;
  const lastRef = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    const now = Date.now();
    const last = lastRef.current;
    if (last && last.path === pathname && now - last.at < DEDUPE_WINDOW_MS) return;
    lastRef.current = { path: pathname, at: now };

    sendFirstPartyPageview({
      path: pathname,
      ua_class: classifyUserAgent(
        typeof navigator === 'undefined' ? '' : navigator.userAgent
      ),
    });
  }, [pathname]);
};