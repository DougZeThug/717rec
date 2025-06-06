
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
  division_name: string | null;
  team_name: string;
  team_logo_url: string | null;
  team_image_url: string | null;
}

interface DivisionPanelProps {
  divisionName: string;
  teams: SeasonData[];
}

const DivisionPanel: React.FC<DivisionPanelProps> = ({ divisionName, teams }) => {
  const champion = teams.find(team => team.champion);
  const sortedTeams = [...teams].sort((a, b) => {
    // Champions first, then by wins
    if (a.champion && !b.champion) return -1;
    if (!a.champion && b.champion) return 1;
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
