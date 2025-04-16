
import React from "react";
import { Team } from "@/types";
import { Link } from "react-router-dom";

interface TeamCardProps {
  team: Team;
}

const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow mb-4 sm:mb-0">
      <Link to={`/teams/${team.id}`} className="block">
        <div className="h-44 bg-gray-200 relative flex items-center justify-center p-3">
          <div className="w-full h-full flex items-center justify-center">
            {team.imageUrl ? (
              <img 
                src={team.imageUrl} 
                alt={team.name} 
                className="max-h-36 max-w-full object-contain"
              />
            ) : (
              <div className="text-gray-400 text-center">
                <span>No Logo Available</span>
              </div>
            )}
          </div>
        </div>
        <div className="p-3">
          <h3 className="text-lg font-bold mb-1.5 truncate" title={team.name}>{team.name}</h3>
          <div className="flex justify-between text-xs">
            <span>Record:</span>
            <span className="font-medium">{team.wins} - {team.losses}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span>Win %:</span>
            <span className="font-medium">
              {((team.wins / (team.wins + team.losses || 1)) * 100).toFixed(1)}%
            </span>
          </div>
          {team.divisionName && (
            <div className="flex justify-between text-xs mt-1">
              <span>Division:</span>
              <span className="font-medium">{team.divisionName}</span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default TeamCard;
