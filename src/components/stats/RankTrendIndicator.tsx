
import React from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { debugLog } from "@/utils/logger";

interface RankTrendIndicatorProps {
  rankChange?: number;
}

const RankTrendIndicator: React.FC<RankTrendIndicatorProps> = ({ rankChange }) => {
  // Add debug info to component
  React.useEffect(() => {
    if (rankChange !== undefined && rankChange !== 0) {
      debugLog(`Rendering trend indicator with change: ${rankChange}`);
    }
  }, [rankChange]);

  // Handle undefined, null, or 0 cases
  if (rankChange === undefined || rankChange === null) {
    return (
      <div className="flex items-center">
        <Minus size={14} className="text-gray-400" />
        <span className="text-gray-400 ml-0.5 text-xs">-</span>
      </div>
    );
  } else if (rankChange === 0) {
    return (
      <div className="flex items-center">
        <Minus size={14} className="text-gray-500" />
        <span className="text-gray-500 ml-0.5 text-xs font-medium">0</span>
      </div>
    );
  } else if (rankChange > 0) {
    // Positive change means team moved up in rankings
    return (
      <div className="flex items-center text-green-600 dark:text-green-400">
        <TrendingUp size={14} />
        <span className="ml-0.5 text-xs font-medium">+{rankChange}</span>
      </div>
    );
  } else {
    // Negative change means team moved down in rankings
    return (
      <div className="flex items-center text-red-600 dark:text-red-400">
        <TrendingDown size={14} />
        <span className="ml-0.5 text-xs font-medium">{rankChange}</span>
      </div>
    );
  }
};

export default RankTrendIndicator;
