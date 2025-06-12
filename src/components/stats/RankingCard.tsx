
import React from "react";
import { Ranking } from "@/types";
import { formatPowerScore, getPowerScoreColor } from "@/utils/colors";
import RankTrendIndicator from "./RankTrendIndicator";
import { getSosColor } from "@/utils/colors";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { TeamLogo } from "@/components/ui/team/TeamLogo";
import { cn } from "@/lib/utils";
import { gradients } from "@/styles/design-system";

interface RankingCardProps {
  ranking: Ranking;
  index: number;
  expandedTeam: string | null;
  onToggleExpand: (teamId: string) => void;
  compactView: boolean;
  showDivision?: boolean;
}

const RankingCard: React.FC<RankingCardProps> = ({
  ranking,
  index,
  expandedTeam,
  onToggleExpand,
  compactView,
  showDivision = false
}) => {
  const isExpanded = expandedTeam === ranking.teamId;
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // Get appropriate gradient for top positions
  const getPositionGradient = () => {
    if (index === 0) return "bg-gradient-to-r from-amber-100 to-amber-200/80 dark:from-amber-900/30 dark:to-amber-800/20";
    if (index === 1) return "bg-gradient-to-r from-gray-100 to-blue-100/80 dark:from-gray-800/60 dark:to-blue-900/20"; 
    if (index === 2) return "bg-gradient-to-r from-orange-100/90 to-orange-200/70 dark:from-orange-900/30 dark:to-orange-800/20";
    return "";
  };

  // Enhanced card styling
  const cardStyle = cn(
    "border rounded-lg overflow-hidden transition-all duration-200",
    isLight ? gradients.card.statHighlight : "bg-gray-800 dark:border-gray-700 hover:bg-gray-800/80",
    index < 3 ? getPositionGradient() : "",
    isExpanded && "shadow-md border-blue-200 dark:border-blue-800/50"
  );

  return (
    <div className={cardStyle}>
      <div
        className={cn(
          compactView ? 'p-2' : 'p-4', 
          "cursor-pointer",
          "hover:bg-gradient-to-br hover:from-blue-50/30 hover:to-orange-50/20 dark:hover:from-blue-900/10 dark:hover:to-orange-900/5"
        )}
        onClick={() => onToggleExpand(ranking.teamId)}
      >
        <div className={`flex flex-col ${compactView ? 'gap-1' : 'gap-2'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn(
                "font-mono text-lg font-bold shrink-0",
                "flex items-center justify-center rounded-full size-6",
                index < 3 ? "bg-gradient-to-br from-blue-100 to-orange-100/70 dark:from-blue-900/30 dark:to-orange-900/20 text-blue-900 dark:text-blue-100" : 
                "text-gray-900 dark:text-white"
              )}>
                {index + 1}
              </span>
              {ranking.divisionRank && !showDivision && (
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                  ({ranking.divisionRank})
                </span>
              )}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {!compactView && (
                  <div className="w-8 h-8 shrink-0">
                    <TeamLogo
                      imageUrl={ranking.logoUrl || ranking.imageUrl}
                      teamName={ranking.teamName}
                      size="sm"
                      className="w-8 h-8"
                    />
                  </div>
                )}
                <Link
                  to={`/teams/${ranking.teamId}`}
                  className="font-bebas tracking-wide text-lg hover:text-blue-600 dark:text-white dark:hover:text-blue-400 block truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {ranking.teamName}
                </Link>
              </div>
            </div>
          </div>
          
          {compactView ? (
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center space-x-4">
                <span className="font-mono text-sm text-gray-900 dark:text-white">{`${ranking.wins}-${ranking.losses}`}</span>
                <span className={cn(
                  `font-mono text-sm ${getPowerScoreColor(ranking.powerScore)}`,
                  "bg-gradient-to-r from-transparent to-blue-50/50 dark:to-blue-900/10 px-1 rounded"
                )}>
                  {formatPowerScore(ranking.powerScore)}
                </span>
                <span className="font-mono text-sm text-gray-900 dark:text-white">{ranking.streak || "-"}</span>
              </div>
              <div className="shrink-0">
                <RankTrendIndicator rankChange={ranking.rankChange} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-1">
              <span className={cn(
                `font-mono text-base font-medium ${getPowerScoreColor(ranking.powerScore)}`,
                "bg-gradient-to-r from-transparent to-blue-50/70 dark:to-blue-900/20 px-2 py-0.5 rounded"
              )}>
                {formatPowerScore(ranking.powerScore)}
              </span>
              <div className="shrink-0 flex items-center justify-end min-w-[50px]">
                <RankTrendIndicator rankChange={ranking.rankChange} />
              </div>
            </div>
          )}
        </div>

        {!compactView && (
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Record:</span>{" "}
              <span className="font-mono text-gray-900 dark:text-white">{`${ranking.wins}-${ranking.losses}`}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Win %:</span>{" "}
              <span className="font-mono text-gray-900 dark:text-white">
                {(ranking.winPercentage * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">SOS:</span>{" "}
              <span className={`font-mono ${getSosColor(ranking.sos)}`}>
                {ranking.sos.toFixed(3)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Streak:</span>{" "}
              <span className="font-mono text-gray-900 dark:text-white">{ranking.streak || "-"}</span>
            </div>
            {showDivision && (
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Division:</span>{" "}
                <span className="italic text-gray-900 dark:text-white">{ranking.divisionName || "Unassigned"}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="bg-gradient-to-br from-blue-50/50 to-orange-50/30 dark:from-gray-800/40 dark:to-gray-900/60 p-4 border-t dark:border-gray-700">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <h4 className="font-medium mb-1 text-gray-800 dark:text-gray-300">Games</h4>
              <p className="font-mono text-gray-900 dark:text-white">
                {ranking.gamesWon}-{ranking.gamesLost} (
                {(ranking.gameWinPercentage * 100).toFixed(1)}%)
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1 text-gray-800 dark:text-gray-300">Close Losses</h4>
              <p className="font-mono text-gray-900 dark:text-white">{ranking.closeMatchLosses}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankingCard;
