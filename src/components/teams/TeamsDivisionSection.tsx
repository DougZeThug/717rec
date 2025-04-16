
import React from 'react';
import { Team } from "@/types";
import { TeamList } from "@/components/teams/TeamList";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface TeamsDivisionSectionProps {
  divisionName: string;
  teams: Team[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  isLoading: boolean;
}

export const TeamsDivisionSection: React.FC<TeamsDivisionSectionProps> = ({
  divisionName,
  teams,
  isExpanded,
  onToggleExpand,
  onEditTeam,
  onDeleteTeam,
  isLoading
}) => {
  if (teams.length === 0) return null;

  // Division color mapping
  const getDivisionColor = () => {
    if (!divisionName) return "gray";
    
    const lowerDivName = divisionName.toLowerCase();
    if (lowerDivName.includes("competitive")) return "bg-red-500";
    if (lowerDivName.includes("intermediate")) return "bg-blue-500";
    if (lowerDivName.includes("recreational")) return "bg-green-500";
    return "bg-gray-400";
  };

  const divisionColor = getDivisionColor();

  return (
    <div className="space-y-4 border-b pb-4 last:border-b-0">
      <div 
        className="flex justify-between items-center cursor-pointer" 
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${divisionColor}`}></div>
          <h2 className="text-xl sm:text-2xl font-semibold">
            {divisionName} <span className="text-muted-foreground font-normal">({teams.length})</span>
          </h2>
        </div>
        <Button variant="ghost" size="sm" className="p-1">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </Button>
      </div>
      
      {isExpanded && (
        <TeamList 
          teams={teams}
          isLoading={isLoading}
          onEdit={onEditTeam}
          onDelete={onDeleteTeam}
        />
      )}
    </div>
  );
};
