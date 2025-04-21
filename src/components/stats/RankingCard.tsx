
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
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // Card background & shadow for light mode, standard for dark
  // Text color: #111111 for headline content, #4b5563 for labels, etc.
  return (
    <Card 
      className={cn(
        "border rounded-[1rem] transition-colors duration-150 cursor-pointer shadow-sm font-inter p-4 mb-2",
        isLight
          ? "bg-[#fff] text-[#111111] border-[#e5e7eb] shadow-[0_2px_4px_rgba(0,0,0,0.05)]"
          : "bg-[#1E1E1E] text-white border-none",
        isExpanded
          ? isLight 
            ? "ring-2 ring-purple-200" 
            : "ring-2 ring-purple-400"
          : "",
        // hover styles
        "hover:bg-gray-50 dark:hover:bg-gray-900",
        "[&_[data-team-name]]:hover:text-blue-600 dark:[&_[data-team-name]]:hover:text-blue-400",
        "[&_[data-team-name]]:hover:underline"
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-team-name="true"]')) {
          e.stopPropagation();
          navigate(`/teams/${ranking.teamId}`);
        } else {
          onToggleExpand(ranking.teamId);
        }
      }}
    >
      <CardContent className="flex gap-4 items-center p-0">
        <div className="flex flex-col items-center w-14 min-w-14">
          {ranking.logoUrl || ranking.imageUrl ? (
            <img 
              src={ranking.logoUrl || ranking.imageUrl!}
              alt={`${ranking.teamName} logo`}
              className="rounded-full shadow w-12 h-12 object-cover mb-2"
              style={{ minWidth: 48, minHeight: 48, maxWidth: 50, maxHeight: 50, borderRadius: 999 }}
            />
          ) : (
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center mb-2",
              isLight ? "bg-gray-200" : "bg-gray-800"
            )} />
          )}
          <span className={cn("text-xs", isLight ? "text-[#4b5563]" : "text-gray-500")}>{index+1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div 
              data-team-name="true"
              className={cn("font-bold leading-tight truncate", isLight ? "text-[#111111]" : "text-white")}
            >
              {ranking.teamName}
            </div>
            {showDivision && (
              <Badge
                variant={ranking.divisionName?.toLowerCase() as any || "default"}
                className={cn("font-medium text-xs ml-1", isLight ? "text-[#4b5563]" : "text-gray-200")}
              >
                {ranking.divisionName || "Unassigned"}
              </Badge>
            )}
            <span className="ml-2">{<RankTrendIndicator rankChange={ranking.rankChange} />}</span>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <span className={cn("text-xs", isLight ? "text-[#4b5563]" : "text-gray-400")}>
              Record:{" "}
              <span className={cn("font-medium", isLight ? "text-[#111111]" : "text-white")}>
                {ranking.wins}-{ranking.losses}
              </span>
            </span>
            <span className={cn("text-xs", isLight ? "text-[#4b5563]" : "text-gray-400")}>
              Power Score:{" "}
              <span className={cn("font-medium", powerScoreColor)}>
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
