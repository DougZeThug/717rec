
import React from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface RankTrendIndicatorProps {
  rankChange?: number;
  mobileView?: boolean;
}

const RankTrendIndicator: React.FC<RankTrendIndicatorProps> = ({ rankChange, mobileView = false }) => {
  // Add debug info to component
  React.useEffect(() => {
    if (rankChange !== undefined && rankChange !== 0) {
      console.log(`Rendering trend indicator with change: ${rankChange}`);
    }
  }, [rankChange]);

  const iconSize = mobileView ? 12 : 16;
  const textSize = mobileView ? "text-[10px]" : "text-xs";

  // Handle undefined, null, or 0 cases
  if (rankChange === undefined || rankChange === null) {
    return (
      <div className="flex items-center">
        <Minus size={iconSize} className="text-gray-400" />
        <span className={`text-gray-400 ml-0.5 ${textSize}`}>-</span>
      </div>
    );
  } else if (rankChange === 0) {
    return (
      <div className="flex items-center">
        <Minus size={iconSize} className="text-gray-500" />
        <span className={`text-gray-500 ml-0.5 ${textSize} font-medium`}>0</span>
      </div>
    );
  } else if (rankChange > 0) {
    // Positive change means team moved up in rankings
    return (
      <div className="flex items-center text-green-600 dark:text-green-400">
        <TrendingUp size={iconSize} />
        <span className={`ml-0.5 ${textSize} font-medium`}>+{rankChange}</span>
      </div>
    );
  } else {
    // Negative change means team moved down in rankings
    return (
      <div className="flex items-center text-red-600 dark:text-red-400">
        <TrendingDown size={iconSize} />
        <span className={`ml-0.5 ${textSize} font-medium`}>{rankChange}</span>
      </div>
    );
  }
};

export default RankTrendIndicator;
