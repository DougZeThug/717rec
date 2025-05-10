
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
    <section id="top-teams-section" className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-900/80 py-6 md:py-8 rounded-xl shadow-sm mb-4">
      <div className="flex flex-wrap justify-between items-center px-3 md:px-0 mb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-cornhole-navy dark:text-white font-sans">Top Teams</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-sans">Based on highest power score ranking</p>
        </div>
        <Button 
          asChild 
          variant="blueOrange"
          className="shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
        >
          <Link to="/teams">View All</Link>
        </Button>
      </div>
      <div className="flex flex-col space-y-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 sm:space-y-0 px-3 md:px-0">
        {teams.map((team) => (
          <div key={team.id} className="rounded-xl shadow-sm bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-700 hover:bg-gradient-to-br hover:from-white hover:via-blue-50/10 hover:to-orange-50/20 dark:hover:from-gray-800/90 dark:hover:to-gray-900 transition-colors duration-200">
            <TeamCard team={team} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default TopTeams;
