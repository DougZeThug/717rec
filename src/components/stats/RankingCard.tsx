
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Ranking } from "@/types";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import RankTrendIndicator from "./RankTrendIndicator";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { TeamStatsGrid } from "./rank/TeamStatsGrid";
import { TeamLogo } from "./rank/TeamLogo";

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
  compactView = false,
  showDivision = false
}) => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const isExpanded = expandedTeam === ranking.teamId;
  const powerScoreColorClass = getPowerScoreColor(ranking.powerScore);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-team-name="true"]')) {
      e.stopPropagation();
      navigate(`/teams/${ranking.teamId}`);
    } else {
      onToggleExpand(ranking.teamId);
    }
  };

  return (
    <Card 
      className={cn(
        "bg-white text-[#1a1a1a] dark:bg-[#1E1E1E] dark:text-white",
        "border border-[#e0e0e0] dark:border-none rounded-xl shadow-sm",
        "font-inter transition-colors duration-150 cursor-pointer",
        "hover:bg-gray-50 dark:hover:bg-gray-900",
        "[&_[data-team-name]]:hover:text-blue-600 dark:[&_[data-team-name]]:hover:text-blue-400",
        "[&_[data-team-name]]:hover:underline",
        isExpanded ? (isLight ? "ring-2 ring-purple-200" : "ring-2 ring-purple-400") : "",
        compactView ? "p-2" : "p-4"
      )}
      onClick={handleCardClick}
    >
      <CardContent className={cn(
        "flex gap-3 items-center p-0",
        compactView ? "min-h-[48px]" : "flex-wrap"
      )}>
        {/* Rank Number */}
        <div className={cn(
          "flex items-center justify-center",
          compactView ? "w-8" : "w-10"
        )}>
          <span 
            style={isLight ? { color: "#222222" } : {}} 
            className={cn(
              "font-medium rounded-full flex items-center justify-center",
              compactView ? "text-sm h-6 w-6" : "text-base h-8 w-8",
              index < 3 ? "bg-amber-100/50 dark:bg-amber-900/30" : ""
            )}
          >
            {index + 1}
          </span>
        </div>

        {/* Team Logo */}
        <div className={cn(
          "flex-shrink-0",
          compactView ? "w-8 h-8" : "w-10 h-10"
        )}>
          <TeamLogo 
            imageUrl={ranking.logoUrl || ranking.imageUrl} 
            teamName={ranking.teamName}
            teamId={ranking.teamId}
            clickable
          />
        </div>

        {/* Team Info & Stats */}
        <div className={cn(
          "flex-1 min-w-0",
          compactView ? "flex items-center gap-2" : "space-y-2"
        )}>
          {/* Team Name Row */}
          <div className={cn(
            "flex items-center gap-2",
            compactView ? "flex-1 min-w-0" : "w-full"
          )}>
            <span
              data-team-name="true"
              className={cn(
                "truncate font-semibold",
                compactView ? "text-sm" : "text-base"
              )}
              style={isLight ? { color: "#111111" } : {}}
            >
              {ranking.teamName}
            </span>
            
            {showDivision && !compactView && (
              <Badge
                variant={ranking.divisionName?.toLowerCase() as any || "default"}
                className="text-xs font-medium px-2"
              >
                {ranking.divisionName || "Unassigned"}
              </Badge>
            )}
          </div>

          {/* Stats Grid */}
          {compactView ? (
            <div className="flex items-center gap-3 ml-auto text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                {ranking.wins}-{ranking.losses}
              </span>
              <span className={powerScoreColorClass}>
                {formatPowerScore(ranking.powerScore)}
              </span>
            </div>
          ) : (
            <TeamStatsGrid
              wins={ranking.wins}
              losses={ranking.losses}
              winPercentage={ranking.winPercentage}
              gamesWon={ranking.gamesWon}
              gamesLost={ranking.gamesLost}
              gameWinPercentage={ranking.gameWinPercentage}
              sos={ranking.sos}
              streak={ranking.streak}
              powerScore={ranking.powerScore}
              compactView={false}
            />
          )}
        </div>

        {/* Trend Indicator (Only in detailed view) */}
        {!compactView && <RankTrendIndicator rankChange={ranking.rankChange} />}
      </CardContent>
    </Card>
  );
};

export default RankingCard;
