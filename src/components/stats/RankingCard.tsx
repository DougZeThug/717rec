
import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Ranking } from "@/types";

interface RankingCardProps {
  ranking: Ranking;
  index: number;
  expandedTeam: string | null;
  onToggleExpand: (teamId: string) => void;
  compactView?: boolean;
  showDivision?: boolean;
}

const RankingCard: React.FC<RankingCardProps> = ({
  ranking,
  index,
  expandedTeam,
  onToggleExpand,
  compactView,
  showDivision
}) => {
  const isExpanded = expandedTeam === ranking.teamId;

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200",
        "hover:shadow-lg hover:border-blue-500",
        "cursor-pointer",
        isExpanded && "border-blue-500 shadow-lg",
        compactView ? "p-3" : "p-4"
      )}
      onClick={() => onToggleExpand(ranking.teamId)}
      data-teamid={ranking.teamId}
    >
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex items-center min-w-0 gap-3">
          {ranking.imageUrl ? (
            <div className="w-9 h-9 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <img
                src={ranking.imageUrl}
                alt={ranking.teamName}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
              N/A
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span
              className="font-bebas uppercase tracking-wide text-base truncate"
              style={{ color: "#111111" }}
              title={ranking.teamName}
            >
              {ranking.teamName}
            </span>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-mono">{`${ranking.wins}-${ranking.losses}`}</span>
              <span className="font-mono">{`${(ranking.winPercentage * 100).toFixed(1)}%`}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">{ranking.powerScore.toFixed(1)}</span>
          <button
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(ranking.teamId);
            }}
          >
            {isExpanded ? "▲" : "▼"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RankingCard;
