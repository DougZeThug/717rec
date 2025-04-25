import React from "react";
import { Ranking } from "@/types";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import RankTrendIndicator from "./RankTrendIndicator";
import { getSosColor } from "@/utils/powerScore/getSosColor";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";

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

  React.useEffect(() => {
    if (ranking.rankChange !== 0) {
      console.log(`Mobile view - Team ${ranking.teamName}: previousRank=${ranking.previousRank}, currentRank=${index + 1}, rankChange=${ranking.rankChange}`);
    }
  }, [ranking, index]);

  return (
    <div className="border rounded-lg overflow-hidden transition-shadow">
      <div
        className="p-4 cursor-pointer"
        onClick={() => onToggleExpand(ranking.teamId)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span className="font-mono text-lg font-bold mr-2">
              {index + 1}
            </span>
            {ranking.divisionRank && !showDivision && (
              <span className="text-xs text-gray-500 mr-2">
                ({ranking.divisionRank})
              </span>
            )}
            <Link
              to={`/teams/${ranking.teamId}`}
              className="font-semibold hover:text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {ranking.teamName}
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <span
                className={`font-mono font-medium text-lg ${
                  isLight ? "" : getPowerScoreColor(ranking.powerScore)
                }`}
                style={{
                  color:
                    isLight && ranking.powerScore
                      ? ranking.powerScore >= 75
                        ? "#2f855a"
                        : ranking.powerScore >= 50
                        ? "#3182ce"
                        : ranking.powerScore >= 30
                        ? "#dd6b20"
                        : "#e53e3e"
                      : undefined,
                }}
              >
                {formatPowerScore(ranking.powerScore)}
              </span>
            </div>
            <div className="w-6">
              <RankTrendIndicator rankChange={ranking.rankChange} />
            </div>
          </div>
        </div>

        {!compactView && (
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Record:</span>{" "}
              <span className="font-mono">{`${ranking.wins}-${ranking.losses}`}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Win %:</span>{" "}
              <span className="font-mono">
                {(ranking.winPercentage * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">SOS:</span>{" "}
              <span
                className={`font-mono ${isLight ? "" : getSosColor(ranking.sos)}`}
                style={{
                  color: isLight ? (
                    ranking.sos >= 0.800 ? "#e53e3e" :
                    ranking.sos >= 0.560 ? "#dd6b20" :
                    "#2f855a"
                  ) : undefined
                }}
              >
                {ranking.sos.toFixed(3)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Streak:</span>{" "}
              <span className="font-mono">{ranking.streak || "-"}</span>
            </div>
            {showDivision && (
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">
                  Division:
                </span>{" "}
                <span className="italic">
                  {ranking.divisionName || "Unassigned"}
                </span>
              </div>
            )}
          </div>
        )}

        {compactView && (
          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
            <div>
              <span className="font-mono">{`${ranking.wins}-${ranking.losses}`}</span>
            </div>
            <div>
              <span className="font-mono">
                {(ranking.winPercentage * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="font-mono">{ranking.streak || "-"}</span>
            </div>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="bg-gray-50 dark:bg-gray-800/40 p-4 border-t">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <h4 className="font-medium mb-1">Games</h4>
              <p className="font-mono">
                {ranking.gamesWon}-{ranking.gamesLost} (
                {(ranking.gameWinPercentage * 100).toFixed(1)}%)
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Close Losses</h4>
              <p className="font-mono">{ranking.closeMatchLosses}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankingCard;
