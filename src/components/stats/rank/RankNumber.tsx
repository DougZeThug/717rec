
import React from "react";

interface RankNumberProps {
  index: number;
}

export const RankNumber: React.FC<RankNumberProps> = ({ index }) => {
  const getRankStyles = (index: number) => {
    if (index === 0) return "bg-amber-100 text-amber-800 font-bold"; // Gold
    if (index === 1) return "bg-slate-100 text-slate-700 font-bold"; // Silver
    if (index === 2) return "bg-orange-100 text-orange-800 font-bold"; // Bronze
    return "bg-gray-50 text-gray-700";
  };

  return (
    <div className={`w-7 h-7 flex items-center justify-center rounded-full ${getRankStyles(index)}`}>
      {index + 1}
    </div>
  );
};
