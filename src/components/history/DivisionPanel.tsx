
import React from "react";
import ChampionCard from "./ChampionCard";
import HistoricalStandingsTable from "./HistoricalStandingsTable";

interface SeasonData {
  team_id: string;
  season_id: string;
  match_wins: number;
  match_losses: number;
  game_wins: number;
  game_losses: number;
  sos: number | null;
  power_score: number | null;
  champion: boolean;
  runner_up: boolean;
  division_name: string | null;
  team_name: string;
  team_logo_url: string | null;
  team_image_url: string | null;
  playoff_rank: number | null;
}

interface DivisionPanelProps {
  divisionName: string;
  teams: SeasonData[];
}

const DivisionPanel: React.FC<DivisionPanelProps> = ({ divisionName, teams }) => {
  const champion = teams.find(team => team.champion);
  
  // Sort teams by playoff_rank (1st, 2nd, 3rd, etc.) with fallback to match wins
  const sortedTeams = [...teams].sort((a, b) => {
    // If both teams have playoff ranks, sort by playoff rank (lower is better)
    if (a.playoff_rank !== null && b.playoff_rank !== null) {
      return a.playoff_rank - b.playoff_rank;
    }
    
    // If only one team has a playoff rank, it should come first
    if (a.playoff_rank !== null && b.playoff_rank === null) return -1;
    if (a.playoff_rank === null && b.playoff_rank !== null) return 1;
    
    // If neither has a playoff rank, fallback to sorting by match wins
    return b.match_wins - a.match_wins;
  });

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-gray-200 dark:border-slate-600 pb-2">
        {divisionName}
      </h4>
      
      {champion && (
        <ChampionCard team={champion} />
      )}
      
      <HistoricalStandingsTable teams={sortedTeams} />
    </div>
  );
};

export default DivisionPanel;
