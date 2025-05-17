
import React from "react";
import { Team } from "@/types";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";

interface MatchScoreHeaderProps {
  team1: Team | null;
  team2: Team | null;
  matchType: string;
  round: number;
}

const MatchScoreHeader: React.FC<MatchScoreHeaderProps> = ({
  team1,
  team2,
  matchType,
  round
}) => {
  return (
    <div className={cn("flex items-center justify-between", animations.scaleIn)}>
      <div className="text-lg font-semibold">
        {team1?.name || "TBD"} vs {team2?.name || "TBD"}
      </div>
      <div className="text-sm text-gray-500">
        {matchType} Round {round}
      </div>
    </div>
  );
};

export default React.memo(MatchScoreHeader);
