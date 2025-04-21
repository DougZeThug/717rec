import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Ranking } from "@/types";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import RankTrendIndicator from "./RankTrendIndicator";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";

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
  const isExpanded = expandedTeam === ranking.teamId;
  const powerScoreColor = getPowerScoreColor(ranking.powerScore);
  const { theme } = useTheme();
  const isLight = theme === "light";

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
        "bg-white text-[#1a1a1a] dark:bg-[#1E1E1E] dark:text-white border border-[#e0e0e0] dark:border-none",
        "rounded-xl shadow-sm font-inter transition-colors duration-150 cursor-pointer",
        "hover:bg-gray-50 dark:hover:bg-gray-900",
        "[&_[data-team-name]]:hover:text-blue-600 dark:[&_[data-team-name]]:hover:text-blue-400",
        "[&_[data-team-name]]:hover:underline",
        "p-4 mb-2",
        isExpanded ? (isLight ? "ring-2 ring-purple-200" : "ring-2 ring-purple-400") : ""
      )}
      onClick={handleCardClick}
    >
      <CardContent className="flex gap-4 items-center p-0">
        <div className="flex flex-col items-center w-14 min-w-14">
          {ranking.logoUrl || ranking.imageUrl ? (
            <img 
              src={ranking.logoUrl || ranking.imageUrl!}
              alt={`${ranking.teamName} logo`}
              className="rounded-full shadow w-12 h-12 object-cover mb-2"
              style={{minWidth: 48, minHeight: 48, maxWidth: 50, maxHeight: 50}}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2" />
          )}
          <span className={isLight ? "text-xs !text-[#222222] font-medium" : "text-xs text-gray-500"}>{index+1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div
              data-team-name="true"
              className={isLight ? "!text-[#111111] !font-semibold leading-tight truncate" : "font-bold text-white leading-tight truncate"}
              style={isLight ? { color: "#111111", fontWeight: 700 } : {}}
            >
              {ranking.teamName}
            </div>
            {showDivision && (
              <Badge
                variant={ranking.divisionName?.toLowerCase() as any || "default"}
                className="font-medium text-xs ml-1"
              >
                {ranking.divisionName || "Unassigned"}
              </Badge>
            )}
            <span className="ml-2">{<RankTrendIndicator rankChange={ranking.rankChange} />}</span>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <span className={isLight ? "text-xs !text-[#444444]" : "text-xs text-gray-400"}>
              Record:{" "}
              <span className={isLight ? "!text-[#222222] font-semibold" : "font-medium text-white"}>
                {ranking.wins}-{ranking.losses}
              </span>
            </span>
            <span className={isLight ? "text-xs !text-[#444444]" : "text-xs text-gray-400"}>
              Power Score:{" "}
              <span className={cn("font-medium", getPowerScoreColor(ranking.powerScore))}>
                {formatPowerScore(ranking.powerScore)}
              </span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RankingCard;
