
import React from "react";
import { Team } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Trophy, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TeamHeaderProps {
  team: Team;
  winPercentage: string;
}

const TeamHeader = ({ team, winPercentage }: TeamHeaderProps) => {
  console.debug('[TeamHeader] props', team.id, team.game_wins, team.game_losses);
  
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
      <Avatar className="h-16 w-16">
        <AvatarImage
          src={team?.logoUrl ?? undefined}
          alt={team?.name ?? "logo"}
        />
        <AvatarFallback>No Logo</AvatarFallback>
      </Avatar>
      
      <div>
        <h1 className="text-3xl font-bold">{team.name}</h1>
        
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {team.divisionName && (
            <Badge variant="outline" className="font-medium">
              {team.divisionName}
            </Badge>
          )}
          
          <div className="flex items-center text-emerald-600 font-semibold">
            <Trophy size={16} className="mr-1" /> 
            {team.wins} Wins
          </div>
          
          <div className="flex items-center text-rose-600 font-semibold">
            <X size={16} className="mr-1" /> 
            {team.losses} Losses
          </div>
          
          <div className="font-semibold">
            {winPercentage}% Win Rate
          </div>

          <div className="font-medium text-gray-600">
            Games: {team.game_wins ?? 0}–{team.game_losses ?? 0}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamHeader;
