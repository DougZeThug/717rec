
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

  const powerScoreInlineStyle = isLight
    ? { 
        color: ranking.powerScore >= 80 ? '#45c47e' : 
               ranking.powerScore >= 70 ? '#3887e6' : 
               ranking.powerScore < 40 ? '#e13d3d' : 
               '#222222'
      }
    : {};

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
        compactView ? "p-3" : "p-4"
      )}
      onClick={handleCardClick}
    >
      <CardContent className={cn(
        "flex gap-4 items-center p-0",
        compactView ? "min-h-[60px]" : ""
      )}>
        <div className={cn(
          "flex flex-col items-center",
          compactView ? "w-10 min-w-10" : "w-14 min-w-14"
        )}>
          {!compactView && (ranking.logoUrl || ranking.imageUrl) ? (
            <img 
              src={ranking.logoUrl || ranking.imageUrl!}
              alt={`${ranking.teamName} logo`}
              className="rounded-full shadow w-12 h-12 object-cover mb-2"
              style={{minWidth: 48, minHeight: 48, maxWidth: 50, maxHeight: 50}}
            />
          ) : null}
          <span 
            style={isLight ? { color: "#222222" } : {}} 
            className={cn(
              "font-medium",
              compactView ? "text-sm" : "text-xs"
            )}
          >
            {index + 1}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div
              data-team-name="true"
              className="leading-tight truncate"
              style={isLight ? { color: "#111111", fontWeight: 700 } : { fontWeight: 700 }}
            >
              {ranking.teamName}
            </div>
            {showDivision && !compactView && (
              <Badge
                variant={ranking.divisionName?.toLowerCase() as any || "default"}
                className="font-medium text-xs ml-1"
                style={isLight ? { color: "#111111" } : {}}
              >
                {ranking.divisionName || "Unassigned"}
              </Badge>
            )}
            {!compactView && <span className="ml-2"><RankTrendIndicator rankChange={ranking.rankChange} /></span>}
          </div>

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
            compactView={compactView}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default RankingCard;
