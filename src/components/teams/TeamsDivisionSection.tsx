
import React from 'react';
import { Team } from "@/types";
import { TeamList } from "@/components/teams/TeamList";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TeamsDivisionSectionProps {
  divisionName: string;
  divisionId: string;
  teams: Team[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  isLoading: boolean;
  viewMode: 'grid' | 'list';
}

export const TeamsDivisionSection: React.FC<TeamsDivisionSectionProps> = ({
  divisionName,
  divisionId,
  teams,
  isExpanded,
  onToggleExpand,
  onEditTeam,
  onDeleteTeam,
  isLoading,
  viewMode
}) => {
  if (teams.length === 0) return null;

  // Division color mapping
  const getDivisionVariant = () => {
    if (!divisionName) return "outline";
    
    const lowerDivName = divisionName.toLowerCase();
    if (lowerDivName.includes("competitive")) return "competitive";
    if (lowerDivName.includes("intermediate")) return "intermediate";
    if (lowerDivName.includes("recreational")) return "recreational";
    return "outline";
  };

  const divisionVariant = getDivisionVariant();

  return (
    <div className="space-y-3 border-b pb-6 last:border-b-0">
      <div 
        className="flex justify-between items-center cursor-pointer bg-muted/30 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors" 
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          <Badge variant={divisionVariant} className="px-3 py-1.5">
            {divisionName} <span className="ml-1.5 opacity-80">({teams.length})</span>
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="animate-accordion-down overflow-hidden transition-all">
          <TeamList 
            teams={teams}
            isLoading={isLoading}
            onEdit={onEditTeam}
            onDelete={onDeleteTeam}
            viewMode={viewMode}
          />
        </div>
      )}
    </div>
  );
};
