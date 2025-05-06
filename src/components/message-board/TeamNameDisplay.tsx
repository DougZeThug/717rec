
import React from "react";
import { cn } from "@/lib/utils";
import { getPowerScoreColor } from "@/utils/colors/powerScoreColors";

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
    <div className={cn("font-bold flex items-center gap-1.5", className)}>
      <span>{username}</span>
      {teamName && (
        <>
          <span className="text-muted-foreground font-normal">(</span>
          <span className={cn("font-medium", scoreColorClass)}>
            {teamName}
          </span>
          <span className="text-muted-foreground font-normal">)</span>
        </>
      )}
    </div>
  );
};

export default TeamNameDisplay;
