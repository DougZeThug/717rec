
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
    <section id="top-teams-section" className="bg-cornhole-cream py-8 md:py-12 rounded-xl shadow-sm mb-4 md:mb-6">
      <div className="flex flex-wrap justify-between items-center px-3 md:px-0 mb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-cornhole-navy font-sans">Top Teams</h2>
          <p className="text-sm text-gray-600 mt-1 font-sans">Based on highest power score ranking</p>
        </div>
        <Button asChild variant="outline" className="text-cornhole-navy border-cornhole-navy hover:bg-cornhole-navy hover:text-white font-sans">
          <Link to="/teams">View All</Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-3 md:px-0">
        {teams.map((team) => (
          <div key={team.id} className="rounded-lg shadow-md bg-white">
            <TeamCard team={team} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default TopTeams;
