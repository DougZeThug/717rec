
import React from "react";
import { Ranking } from "@/types";
import { formatPowerScore, getPowerScoreColor } from "@/utils/colors";
import RankTrendIndicator from "./RankTrendIndicator";
import { getSosColor } from "@/utils/colors";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { TeamLogo } from "@/components/ui/team/TeamLogo";

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

  return (
    <div className="border rounded-lg overflow-hidden transition-shadow bg-white dark:bg-gray-800 dark:border-gray-700">
      <div
        className={`${compactView ? 'p-2' : 'p-4'} cursor-pointer`}
        onClick={() => onToggleExpand(ranking.teamId)}
      >
        <div className={`flex flex-col ${compactView ? 'gap-1' : 'gap-2'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-lg font-bold shrink-0 text-gray-900 dark:text-white">
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
          
          <div className="flex items-center justify-between gap-1">
            <span className={`font-mono ${compactView ? 'text-sm' : 'text-base'} font-medium ${getPowerScoreColor(ranking.powerScore)}`}>
              {formatPowerScore(ranking.powerScore)}
            </span>
            <div className="shrink-0 flex items-center justify-end min-w-[50px]">
              <RankTrendIndicator rankChange={ranking.rankChange} />
            </div>
          </div>
        </div>

        {!compactView ? (
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
        ) : (
          <div className="flex items-center justify-between mt-1 text-xs">
            <span className="font-mono text-gray-900 dark:text-white">{`${ranking.wins}-${ranking.losses}`}</span>
            <span className="font-mono text-gray-900 dark:text-white">
              {(ranking.winPercentage * 100).toFixed(1)}%
            </span>
            <span className="font-mono text-gray-900 dark:text-white">{ranking.streak || "-"}</span>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="bg-gray-50 dark:bg-gray-800/40 p-4 border-t dark:border-gray-700">
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
