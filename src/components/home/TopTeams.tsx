
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Team } from "@/types";
import TeamCard from "./TeamCard";

interface TopTeamsProps {
  teams: Team[];
}

const TopTeams: React.FC<TopTeamsProps> = ({ teams }) => {
  return (
    <section id="top-teams-section">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-cornhole-navy">Top Teams</h2>
          <p className="text-sm text-gray-600 mt-1">Based on highest power score ranking</p>
        </div>
        <Button asChild variant="outline" className="text-cornhole-navy border-cornhole-navy hover:bg-cornhole-navy hover:text-white">
          <Link to="/teams">View All</Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </section>
  );
};

export default TopTeams;
