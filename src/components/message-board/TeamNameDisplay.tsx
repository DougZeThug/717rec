
import React from "react";
import { cn } from "@/lib/utils";
import { getPowerScoreColor } from "@/utils/colors/powerScoreColors";
import { Badge } from "@/components/ui/badge";

interface TeamNameDisplayProps {
  username: string;
  teamName: string | null;
  powerScore?: number;
  className?: string;
}

const TeamNameDisplay: React.FC<TeamNameDisplayProps> = ({ 
  username, 
  teamName, 
  powerScore,
  className 
}) => {
  // Get the appropriate color class based on the team's power score
  const scoreColorClass = getPowerScoreColor(powerScore);
  
  return (
    <div className={cn("font-medium flex flex-wrap items-center gap-1.5", className)}>
      <span className="font-semibold">{username}</span>
      {teamName && (
        <Badge 
          variant="outline" 
          className={cn("py-0 text-xs font-medium", scoreColorClass)}
        >
          {teamName}
        </Badge>
      )}
    </div>
  );
};

export default TeamNameDisplay;
