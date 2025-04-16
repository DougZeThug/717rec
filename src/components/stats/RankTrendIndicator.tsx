
import React from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface RankTrendIndicatorProps {
  rankChange?: number;
}

const RankTrendIndicator: React.FC<RankTrendIndicatorProps> = ({ rankChange }) => {
  if (!rankChange || rankChange === 0) {
    return <div className="flex items-center"><Minus size={16} className="text-gray-500" /><span className="text-gray-500 ml-1 text-xs">0</span></div>;
  } else if (rankChange > 0) {
    return (
      <div className="flex items-center text-green-500">
        <TrendingUp size={16} className="text-green-500" />
        <span className="ml-1 text-xs font-medium">+{rankChange}</span>
      </div>
    );
  } else {
    return (
      <div className="flex items-center text-red-500">
        <TrendingDown size={16} className="text-red-500" />
        <span className="ml-1 text-xs font-medium">{rankChange}</span>
      </div>
    );
  }
};

export default RankTrendIndicator;
