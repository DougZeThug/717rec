import { Loader2 } from 'lucide-react';
import React from 'react';

const LoadingState = () => {
  return (
    <div className="min-h-screen cornhole-bg flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Loader2 className="h-10 w-10 text-cornhole-navy animate-spin mb-4" />
        <p className="text-lg">Loading team data...</p>
      </div>
    </div>
  );
};

export default LoadingState;
