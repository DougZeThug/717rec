import { Loader2 } from 'lucide-react';
import React from 'react';

interface PlayoffLoadingViewProps {
  label?: string;
}

export const PlayoffLoadingView: React.FC<PlayoffLoadingViewProps> = ({ label = 'Loading...' }) => {
  return (
    // role="status" makes a screen reader announce the label, as the shared
    // LoadingState does. text-primary, not cornhole-navy: the navy was 1.73:1 on
    // the dark page.
    <div
      className="flex flex-col items-center justify-center py-8"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-8 text-primary animate-spin mb-2" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
};
