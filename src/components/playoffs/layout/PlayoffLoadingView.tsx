import { Loader2 } from 'lucide-react';
import React from 'react';

interface PlayoffLoadingViewProps {
  label?: string;
}

export const PlayoffLoadingView: React.FC<PlayoffLoadingViewProps> = ({ label = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="w-8 h-8 text-cornhole-navy animate-spin mb-2" />
      <p>{label}</p>
    </div>
  );
};
