
import React from "react";
import { Medal } from "lucide-react";

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
}

interface RunnerUpCardProps {
  team: SeasonData;
}

const RunnerUpCard: React.FC<RunnerUpCardProps> = ({ team }) => {
  const winPercentage = team.match_wins + team.match_losses > 0 
    ? (team.match_wins / (team.match_wins + team.match_losses)) * 100 
    : 0;

  return (
    <div className="bg-gradient-to-r from-gray-100 to-slate-200 dark:from-gray-700 dark:to-slate-600 rounded-lg p-4 border-2 border-gray-300 dark:border-gray-500">
      <div className="flex items-center gap-3 mb-3">
        <Medal className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        <div>
          <h5 className="text-lg font-bold text-gray-800 dark:text-gray-100">Runner-Up</h5>
          <p className="text-sm text-gray-600 dark:text-gray-300">Division Runner-Up</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {team.team_logo_url && (
          <img 
            src={team.team_logo_url} 
            alt={`${team.team_name} logo`}
            className="w-12 h-12 rounded-full object-cover border-2 border-gray-400"
          />
        )}
        <div className="flex-1">
          <h6 className="font-bold text-gray-900 dark:text-white text-lg">{team.team_name}</h6>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-200 mt-1">
            <span>Record: {team.match_wins}-{team.match_losses}</span>
            <span>Win %: {winPercentage.toFixed(1)}%</span>
            <span>Games: {team.game_wins}-{team.game_losses}</span>
            {team.power_score && (
              <span>Power: {team.power_score.toFixed(2)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunnerUpCard;
