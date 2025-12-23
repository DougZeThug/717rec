import React from "react";
import { cn } from "@/lib/utils";
import { Ranking } from "@/types";
import { Link } from "react-router-dom";
import { TeamLogo } from "@/components/shared/TeamLogo";
import RankTrendIndicator from "./RankTrendIndicator";
import TeamBadgeCollection from "@/components/badges/TeamBadgeCollection";
import { getPowerScoreColor, getSosColor, formatPowerScore } from "@/utils/colors";
import { motion } from "framer-motion";
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";
interface RankingCardProps {
  ranking: Ranking;
  index: number;
  showRankChange?: boolean;
  expandedTeam?: string | null;
  onToggleExpand?: (teamId: string) => void;
  compactView?: boolean;
  showDivision?: boolean;
}

const RankingCard: React.FC<RankingCardProps> = ({ 
  ranking, 
  index, 
  showRankChange = true,
  expandedTeam,
  onToggleExpand,
  compactView = false,
  showDivision = false
}) => {
  const { isWinterTheme } = useSeasonalTheme();
  const globalRank = index + 1;
  const divisionRank = ranking.divisionRank;
  const hasGames = ranking.wins + ranking.losses > 0;
  const winPercentage = ranking.winPercentage * 100;
  const gameWinPercentage = (ranking.gameWinPercentage || 0) * 100;
  const isExpanded = expandedTeam === ranking.teamId;

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand(ranking.teamId);
    }
  };

  // Format rank display based on view mode
  const formatRankDisplay = () => {
    if (showDivision) {
      // Unified view: show only global rank
      return `#${globalRank}`;
    } else {
      // Division view: show division rank with global rank in parentheses
      if (divisionRank) {
        return `#${divisionRank} (${globalRank})`;
      }
      return `#${globalRank}`;
    }
  };

  if (compactView) {
    return (
      <motion.div 
        className={cn(
          "ranking-card rounded-lg border p-3 cursor-pointer",
          isWinterTheme 
            ? "winter-card-surface border-frost-border/30" 
            : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
        )}
        onClick={handleToggleExpand}
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-bold whitespace-nowrap",
              isWinterTheme ? "text-[hsl(var(--foreground))]" : "text-slate-900 dark:text-white"
            )}>
              {formatRankDisplay()}
            </span>
            {showRankChange && (
              <RankTrendIndicator rankChange={ranking.rankChange} />
            )}
          </div>
          <TeamBadgeCollection
            teamId={ranking.teamId}
            size="sm"
            maxDisplay={2}
          />
        </div>
        
        <Link 
          to={`/teams/${ranking.teamId}`}
          className="flex items-center gap-2 mt-2 group"
        >
          <TeamLogo
            imageUrl={ranking.imageUrl || ranking.logoUrl}
            teamName={ranking.teamName}
            size="sm"
            className="flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className={cn(
              "text-sm font-semibold transition-colors truncate",
              isWinterTheme 
                ? "text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]" 
                : "text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400"
            )}>
              {ranking.teamName}
            </h3>
            {showDivision && ranking.divisionName && (
              <p className={cn(
                "text-xs",
                isWinterTheme ? "text-[hsl(var(--muted-foreground))]" : "text-gray-600 dark:text-gray-400"
              )}>
                {ranking.divisionName}
              </p>
            )}
          </div>
        </Link>

        <div className="flex justify-between mt-2 text-xs">
          <span className={cn(
            "tabular-nums",
            isWinterTheme ? "text-[hsl(var(--muted-foreground))]" : "text-gray-600 dark:text-gray-400"
          )}>
            {ranking.wins}-{ranking.losses}
          </span>
          <span className={cn("font-medium tabular-nums", getPowerScoreColor(ranking.powerScore))}>
            {formatPowerScore(ranking.powerScore)}
          </span>
        </div>

        {isExpanded && (
          <div className={cn(
            "mt-3 pt-3 border-t",
            isWinterTheme ? "border-frost-border/30" : "border-gray-200 dark:border-slate-700"
          )}>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className={cn(
                  isWinterTheme ? "text-[hsl(var(--muted-foreground))]" : "text-gray-600 dark:text-gray-400"
                )}>Win %</p>
                <p className={cn(
                  "font-bold tabular-nums",
                  !hasGames ? "text-gray-500 dark:text-gray-400" :
                  winPercentage >= 75 ? "text-green-600 dark:text-green-500" :
                  winPercentage >= 60 ? "text-blue-600 dark:text-blue-500" :
                  winPercentage >= 40 ? "text-orange-500 dark:text-orange-400" :
                  "text-red-600 dark:text-red-500"
                )}>
                  {hasGames ? `${winPercentage.toFixed(1)}%` : '—'}
                </p>
              </div>
              <div>
                <p className={cn(
                  isWinterTheme ? "text-[hsl(var(--muted-foreground))]" : "text-gray-600 dark:text-gray-400"
                )}>SOS</p>
                <p className={cn("font-bold tabular-nums", getSosColor(ranking.sos || 0))}>
                  {(ranking.sos || 0).toFixed(3)}
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={cn(
        "ranking-card rounded-lg border p-4",
        isWinterTheme 
          ? "winter-card-surface border-frost-border/30" 
          : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
      )}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-lg font-bold whitespace-nowrap",
            isWinterTheme ? "text-[hsl(var(--foreground))]" : "text-slate-900 dark:text-white"
          )}>
            {formatRankDisplay()}
          </span>
          {showRankChange && (
            <RankTrendIndicator rankChange={ranking.rankChange} />
          )}
        </div>
        <TeamBadgeCollection 
          teamId={ranking.teamId}
          size="sm"
          maxDisplay={3}
        />
      </div>
      
      <Link 
        to={`/teams/${ranking.teamId}`}
        className="flex items-center gap-3 mb-4 group"
      >
        <TeamLogo
          imageUrl={ranking.imageUrl || ranking.logoUrl}
          teamName={ranking.teamName}
          size="md"
          className="flex-shrink-0"
        />
        <div className="min-w-0">
          <h3 className={cn(
            "font-semibold transition-colors truncate",
            isWinterTheme 
              ? "text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]" 
              : "text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400"
          )}>
            {ranking.teamName}
          </h3>
          <p className={cn(
            "text-sm",
            isWinterTheme ? "text-[hsl(var(--muted-foreground))]" : "text-gray-600 dark:text-gray-400"
          )}>
            {ranking.divisionName}
          </p>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className={cn(
            "font-medium",
            isWinterTheme ? "text-[hsl(var(--muted-foreground))]" : "text-gray-600 dark:text-gray-400"
          )}>Record</p>
          <p className={cn(
            "font-bold tabular-nums",
            isWinterTheme ? "text-[hsl(var(--foreground))]" : "text-slate-900 dark:text-white"
          )}>
            {ranking.wins}-{ranking.losses}
          </p>
        </div>
        <div>
          <p className={cn(
            "font-medium",
            isWinterTheme ? "text-[hsl(var(--muted-foreground))]" : "text-gray-600 dark:text-gray-400"
          )}>Win %</p>
          <p className={cn(
            "font-bold tabular-nums",
            !hasGames ? "text-gray-500 dark:text-gray-400" :
            winPercentage >= 75 ? "text-green-600 dark:text-green-500" :
            winPercentage >= 60 ? "text-blue-600 dark:text-blue-500" :
            winPercentage >= 40 ? "text-orange-500 dark:text-orange-400" :
            "text-red-600 dark:text-red-500"
          )}>
            {hasGames ? `${winPercentage.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div>
          <p className={cn(
            "font-medium",
            isWinterTheme ? "text-[hsl(var(--muted-foreground))]" : "text-gray-600 dark:text-gray-400"
          )}>Games</p>
          <p className={cn(
            "font-bold tabular-nums",
            isWinterTheme ? "text-[hsl(var(--foreground))]" : "text-slate-900 dark:text-white"
          )}>
            {ranking.gamesWon || 0}-{ranking.gamesLost || 0}
          </p>
        </div>
        <div>
          <p className={cn(
            "font-medium",
            isWinterTheme ? "text-[hsl(var(--muted-foreground))]" : "text-gray-600 dark:text-gray-400"
          )}>Game %</p>
          <p className={cn(
            "font-bold tabular-nums",
            gameWinPercentage >= 75 ? "text-green-600 dark:text-green-500" :
            gameWinPercentage >= 60 ? "text-blue-600 dark:text-blue-500" :
            gameWinPercentage >= 40 ? "text-orange-500 dark:text-orange-400" :
            "text-red-600 dark:text-red-500"
          )}>
            {gameWinPercentage.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className={cn(
            "font-medium",
            isWinterTheme ? "text-[hsl(var(--muted-foreground))]" : "text-gray-600 dark:text-gray-400"
          )}>Power</p>
          <p className={cn("font-bold tabular-nums", getPowerScoreColor(ranking.powerScore))}>
            {formatPowerScore(ranking.powerScore)}
          </p>
        </div>
        <div>
          <p className={cn(
            "font-medium",
            isWinterTheme ? "text-[hsl(var(--muted-foreground))]" : "text-gray-600 dark:text-gray-400"
          )}>SOS</p>
          <p className={cn("font-bold tabular-nums", getSosColor(ranking.sos || 0))}>
            {(ranking.sos || 0).toFixed(3)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default RankingCard;
