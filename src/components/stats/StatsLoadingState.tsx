
import React from "react";
import { Loader2 } from "lucide-react";

const StatsLoadingState: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Loader2 className="h-10 w-10 text-cornhole-navy animate-spin mb-4" />
        <p className="text-lg">Loading team statistics...</p>
      </div>
    </div>
  );
};

export default StatsLoadingState;
