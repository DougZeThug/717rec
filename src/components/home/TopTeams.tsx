
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
    <section id="top-teams-section" className="bg-gray-50 dark:bg-gray-900 py-6 md:py-8 rounded-xl shadow-sm mb-4">
      <div className="flex flex-wrap justify-between items-center px-3 md:px-0 mb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-cornhole-navy dark:text-white font-sans">Top Teams</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-sans">Based on highest power score ranking</p>
        </div>
        <Button 
          asChild 
          variant="default"
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-semibold dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:border dark:border-indigo-400/50"
        >
          <Link to="/teams">View All</Link>
        </Button>
      </div>
      <div className="flex flex-col space-y-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 sm:space-y-0 px-3 md:px-0">
        {teams.map((team) => (
          <div key={team.id} className="rounded-xl shadow-sm bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-700">
            <TeamCard team={team} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default TopTeams;
