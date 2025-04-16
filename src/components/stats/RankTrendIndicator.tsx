
import React from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface RankTrendIndicatorProps {
  rankChange?: number;
}

const RankTrendIndicator: React.FC<RankTrendIndicatorProps> = ({ rankChange }) => {
  if (!rankChange || rankChange === 0) {
    return <Minus size={16} className="text-gray-500" />;
  } else if (rankChange > 0) {
    return <TrendingUp size={16} className="text-green-500" />;
  } else {
    return <TrendingDown size={16} className="text-red-500" />;
  }
};

export default RankTrendIndicator;
