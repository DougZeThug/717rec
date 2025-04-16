
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Team } from "@/types";

interface TopTeamsProps {
  teams: Team[];
}

const TopTeams: React.FC<TopTeamsProps> = ({ teams }) => {
  return (
    <section>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-cornhole-navy">Top Teams</h2>
        <Button asChild variant="outline" className="text-cornhole-navy border-cornhole-navy hover:bg-cornhole-navy hover:text-white">
          <Link to="/teams">View All</Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {teams.map((team) => (
          <div key={team.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
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
        ))}
      </div>
    </section>
  );
};

export default TopTeams;
