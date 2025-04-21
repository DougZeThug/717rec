
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Ranking } from "@/types";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import RankTrendIndicator from "./RankTrendIndicator";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
        "cursor-pointer transition-colors",
        "hover:bg-gray-50",
        "[&_[data-team-name]]:hover:text-blue-600 [&_[data-team-name]]:hover:underline"
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-lg font-semibold w-8">{index + 1}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div data-team-name="true" className="font-medium">
                  {ranking.teamName}
                </div>
                {showDivision && (
                  <Badge
                    variant={ranking.divisionName?.toLowerCase() as any || "default"}
                    className="font-normal text-xs"
                  >
                    {ranking.divisionName || "Unassigned"}
                  </Badge>
                )}
              </div>
              {!compactView && (
                <div className="text-sm text-gray-500">
                  Games: {ranking.gamesWon}-{ranking.gamesLost}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-semibold ${powerScoreColor}`}>
              {formatPowerScore(ranking.powerScore)}
            </div>
            {!compactView && (
              <div className="flex items-center justify-end space-x-1 text-gray-500">
                <RankTrendIndicator rankChange={ranking.rankChange} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RankingCard;
