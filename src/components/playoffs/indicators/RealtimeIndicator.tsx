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
    <ViewportPortal>
      <div className="fixed bottom-[calc(var(--bottom-nav-h)+1rem)] md:bottom-4 right-4 z-20 bg-green-100 dark:bg-green-900/30 rounded-full px-3 py-1 text-xs flex items-center shadow-md">
        <span className="size-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
        <span className="text-green-700 dark:text-green-400">Live updates enabled</span>
      </div>
    </ViewportPortal>
  );
};

export default RealtimeIndicator;
