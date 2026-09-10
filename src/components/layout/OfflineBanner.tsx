import { CloudOff, Wifi } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface OfflineBannerProps {
  /** How long the "Back online" confirmation stays on screen. */
  showRecoveredForMs?: number;
}

/**
 * Says, on every page, that the connection has gone.
 *
 * Until now nothing did (UX audit X-12). Data already fetched stayed on screen
 * and looked current, every signed-in control was still drawn, and the user
 * found out by pressing something. At a venue with poor signal that is the
 * worst moment to be guessing.
 *
 * Deliberately **not** sticky. The site header is already `sticky top-0 z-50`,
 * so a second sticky bar slides underneath it — the same reason the admin phone
 * menu is not sticky either (see `AdminMobileNav`). This sits in normal flow
 * directly under the header, where it pushes the page down rather than covering
 * it, and scrolls away once it has been read.
 *
 * `role="status"` and not a landmark: `role="banner"` would be a second one on
 * every page and the accessibility gate forbids that.
 */
export const OfflineBanner: React.FC<OfflineBannerProps> = ({ showRecoveredForMs = 4000 }) => {
  const isOnline = useOnlineStatus();
  const [showRecovered, setShowRecovered] = useState(false);
  // Nothing to celebrate on a first load that was already online.
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return undefined;
    }
    if (!wasOffline.current) return undefined;
    wasOffline.current = false;
    setShowRecovered(true);
    const timer = window.setTimeout(() => setShowRecovered(false), showRecoveredForMs);
    return () => window.clearTimeout(timer);
  }, [isOnline, showRecoveredForMs]);

  if (isOnline && !showRecovered) return null;

  if (isOnline) {
    return (
      <div
        role="status"
        data-testid="offline-banner"
        className="flex items-center justify-center gap-2 border-b border-green-500/30 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 dark:bg-green-950/30 dark:text-green-400"
      >
        <Wifi className="size-4 shrink-0" aria-hidden />
        Back online. Anything waiting to send is on its way.
      </div>
    );
  }

  return (
    <div
      role="status"
      data-testid="offline-banner"
      className="flex items-center justify-center gap-2 border-b border-amber-500/40 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
    >
      <CloudOff className="size-4 shrink-0" aria-hidden />
      <span>
        You are offline. Pages you have already opened still work. New ones and saves wait for the
        signal.
      </span>
    </div>
  );
};
