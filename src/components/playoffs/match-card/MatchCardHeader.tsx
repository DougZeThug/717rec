
import React from "react";
import { cn } from "@/lib/utils";

interface MatchCardHeaderProps {
  bestOf: number;
  seriesScore: string;
  position: number;
}

const MatchCardHeader: React.FC<MatchCardHeaderProps> = ({
  bestOf,
  seriesScore,
  position
}) => {
  return (
    <div className="flex justify-between items-center mb-1 text-xs text-gray-500 dark:text-gray-400">
      <div className="flex items-center">
        <span>Best of {bestOf || 3}</span>
        {seriesScore && (
          <span className="ml-2 font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
            {seriesScore}
          </span>
        )}
      </div>
      <span className="text-xs font-mono">Match #{position}</span>
    </div>
  );
};

export default MatchCardHeader;
