import React from 'react';

import ViewportPortal from '@/components/layout/ViewportPortal';

interface RealtimeIndicatorProps {
  enabled: boolean;
}

const RealtimeIndicator: React.FC<RealtimeIndicatorProps> = ({ enabled }) => {
  if (!enabled) {
    return null;
  }

  return (
    // Portalled so it stays on the screen, and lifted above the phone tab bar.
    // On a phone it is only the pulsing dot: the full pill covered bracket rows,
    // buttons and the footer. The words stay in the page for screen readers
    // (sr-only), and `pointer-events-none` lets a tap go through to whatever is
    // underneath. From md up it is the full pill.
    <ViewportPortal>
      <div
        role="status"
        className="pointer-events-none md:pointer-events-auto fixed bottom-[calc(var(--bottom-nav-h)+1rem)] md:bottom-4 right-4 z-20 bg-green-100 dark:bg-green-900/30 rounded-full p-2 md:px-3 md:py-1 text-xs flex items-center shadow-md"
      >
        <span
          aria-hidden="true"
          className="size-2 rounded-full bg-green-500 md:mr-2 animate-pulse"
        />
        <span className="sr-only md:not-sr-only text-green-700 dark:text-green-400">
          Live updates enabled
        </span>
      </div>
    </ViewportPortal>
  );
};

export default RealtimeIndicator;
