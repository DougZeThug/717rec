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
        "flex gap-3 p-0",
        compactView ? "items-center min-h-[48px]" : "flex-col"
      )}>
        <div className="flex items-center gap-3 w-full">
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

          <div className={cn(
            "flex-shrink-0",
            compactView ? "w-8 h-8" : "w-12 h-12"
          )}>
            <TeamLogo 
              imageUrl={ranking.logoUrl || ranking.imageUrl} 
              teamName={ranking.teamName}
              teamId={ranking.teamId}
              clickable
            />
          </div>

          <div className="flex-1 min-w-0">
            <span
              data-team-name="true"
              className={cn(
                "block truncate font-semibold",
                compactView ? "text-sm" : "text-base mb-1"
              )}
              style={isLight ? { color: "#111111" } : {}}
            >
              {ranking.teamName}
            </span>
            
            {showDivision && !compactView && (
              <Badge
                variant={ranking.divisionName?.toLowerCase() as any || "default"}
                className="text-xs font-medium px-2 mt-1"
              >
                {ranking.divisionName || "Unassigned"}
              </Badge>
            )}
          </div>

          {compactView && (
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-gray-600 dark:text-gray-300">
                {ranking.wins}-{ranking.losses}
              </span>
              <span className={getPowerScoreColor(ranking.powerScore)}>
                {formatPowerScore(ranking.powerScore)}
              </span>
            </div>
          )}
        </div>

        {!compactView && (
          <div className="mt-3 w-full">
            <TeamStatsGrid
              wins={ranking.wins}
              losses={ranking.losses}
              winPercentage={ranking.winPercentage}
              gamesWon={ranking.gamesWon}
              gamesLost={ranking.gamesLost}
              gameWinPercentage={ranking.gameWinPercentage}
              sos={ranking.sos}
              streak={ranking.streak || ''}
              powerScore={ranking.powerScore}
              rankChange={ranking.rankChange}
              compactView={compactView}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RankingCard;
