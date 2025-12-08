import React from "react";
import { AnimatedRankNumber } from "../AnimatedRankNumber";

interface RankNumberProps {
  index: number;
  previousRank?: number;
}

export const RankNumber: React.FC<RankNumberProps> = ({ index, previousRank }) => {
  // Convert 0-based index to 1-based rank for display
  const rank = index + 1;
  const prevRank = previousRank !== undefined ? previousRank + 1 : undefined;
  
  return (
    <AnimatedRankNumber 
      rank={rank} 
      previousRank={prevRank}
      showFlash={true}
    />
  );
};
