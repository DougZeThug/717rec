
import React from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface RankTrendIndicatorProps {
  rankChange?: number;
}

const RankTrendIndicator: React.FC<RankTrendIndicatorProps> = ({ rankChange }) => {
  // Handle undefined, null, or 0 cases
  if (rankChange === undefined || rankChange === null) {
    return (
      <div className="flex items-center">
        <Minus size={16} className="text-gray-400" />
        <span className="text-gray-400 ml-1 text-xs">0</span>
      </div>
    );
  } else if (rankChange === 0) {
    return (
      <div className="flex items-center">
        <Minus size={16} className="text-gray-500" />
        <span className="text-gray-500 ml-1 text-xs font-medium">0</span>
      </div>
    );
  } else if (rankChange > 0) {
    // Positive change means team moved up in rankings
    return (
      <div className="flex items-center text-green-600 dark:text-green-400">
        <TrendingUp size={16} />
        <span className="ml-1 text-xs font-medium">+{rankChange}</span>
      </div>
    );
  } else {
    // Negative change means team moved down in rankings
    return (
      <div className="flex items-center text-red-600 dark:text-red-400">
        <TrendingDown size={16} />
        <span className="ml-1 text-xs font-medium">{rankChange}</span>
      </div>
    );
  }
};

export default RankTrendIndicator;
