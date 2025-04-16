
import React from "react";
import { Team } from "@/types";

interface TeamCardProps {
  team: Team;
}

const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-40 bg-gray-200 relative flex items-center justify-center p-4">
        {team.imageUrl ? (
          <img 
            src={team.imageUrl} 
            alt={team.name} 
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-gray-400 text-center">
            <span>No Logo Available</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold mb-2 truncate" title={team.name}>{team.name}</h3>
        <div className="flex justify-between text-sm">
          <span>Record:</span>
          <span className="font-medium">{team.wins} - {team.losses}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span>Win %:</span>
          <span className="font-medium">
            {((team.wins / (team.wins + team.losses || 1)) * 100).toFixed(1)}%
          </span>
        </div>
        {team.divisionName && (
          <div className="flex justify-between text-sm mt-1">
            <span>Division:</span>
            <span className="font-medium">{team.divisionName}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamCard;
