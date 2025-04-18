
import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TeamLogo } from "./TeamLogo";

interface TeamCellProps {
  teamName: string;
  imageUrl: string | null | undefined;
  isExpanded: boolean;
}

export const TeamCell: React.FC<TeamCellProps> = ({ teamName, imageUrl, isExpanded }) => {
  return (
    <div className="flex items-center space-x-3">
      <TeamLogo imageUrl={imageUrl} teamName={teamName} />
      <div className="flex items-center space-x-1">
        <span className="font-medium">{teamName}</span>
        {isExpanded ? (
          <ChevronUp size={16} className="text-gray-500" />
        ) : (
          <ChevronDown size={16} className="text-gray-500" />
        )}
      </div>
    </div>
  );
};
