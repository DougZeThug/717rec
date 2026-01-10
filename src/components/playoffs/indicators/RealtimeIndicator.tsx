import React from 'react';

interface RealtimeIndicatorProps {
  enabled: boolean;
}

const RealtimeIndicator: React.FC<RealtimeIndicatorProps> = ({ enabled }) => {
  if (!enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-20 bg-green-100 dark:bg-green-900/30 rounded-full px-3 py-1 text-xs flex items-center shadow-md">
      <span className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
      <span className="text-green-700 dark:text-green-400">Live updates enabled</span>
    </div>
  );
};

export default RealtimeIndicator;
