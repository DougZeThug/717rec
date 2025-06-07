
import React from "react";
import { Crown, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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

interface HistoricalStandingsTableProps {
  teams: SeasonData[];
}

const HistoricalStandingsTable: React.FC<HistoricalStandingsTableProps> = ({ teams }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-3">
        {teams.map((team, index) => {
          const winPercentage = team.match_wins + team.match_losses > 0 
            ? (team.match_wins / (team.match_wins + team.match_losses)) * 100 
            : 0;
          const gameWinPercentage = team.game_wins + team.game_losses > 0 
            ? (team.game_wins / (team.game_wins + team.game_losses)) * 100 
            : 0;

          return (
            <div
              key={team.team_id}
              className={cn(
                "bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3",
                team.champion && "ring-2 ring-yellow-400 dark:ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
                team.runner_up && "ring-2 ring-gray-400 dark:ring-gray-500 bg-gray-100 dark:bg-gray-900/20"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                    #{index + 1}
                  </span>
                  {team.champion && (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  )}
                  {team.runner_up && (
                    <Medal className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  )}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {team.team_name}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Record:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-white">
                    {team.match_wins}-{team.match_losses} ({winPercentage.toFixed(1)}%)
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Games:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-white">
                    {team.game_wins}-{team.game_losses} ({gameWinPercentage.toFixed(1)}%)
                  </span>
                </div>
                {team.power_score !== null && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-300">Power Score:</span>
                    <span className="ml-2 font-medium text-slate-900 dark:text-white">
                      {team.power_score.toFixed(2)}
                    </span>
                  </div>
                )}
                {team.sos !== null && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-300">SOS:</span>
                    <span className="ml-2 font-medium text-slate-900 dark:text-white">
                      {team.sos.toFixed(3)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-600">
            <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Rank</th>
            <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Team</th>
            <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-300">W-L</th>
            <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Win %</th>
            <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Games</th>
            <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Game %</th>
            <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Power</th>
            <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-300">SOS</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => {
            const winPercentage = team.match_wins + team.match_losses > 0 
              ? (team.match_wins / (team.match_wins + team.match_losses)) * 100 
              : 0;
            const gameWinPercentage = team.game_wins + team.game_losses > 0 
              ? (team.game_wins / (team.game_wins + team.game_losses)) * 100 
              : 0;

            return (
              <tr
                key={team.team_id}
                className={cn(
                  "border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50",
                  team.champion && "bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
                  team.runner_up && "bg-gray-100 dark:bg-gray-900/20 hover:bg-gray-200 dark:hover:bg-gray-900/30"
                )}
              >
                <td className="py-2 px-3 text-gray-600 dark:text-gray-300">#{index + 1}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    {team.champion && (
                      <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    )}
                    {team.runner_up && (
                      <Medal className="w-4 h-4 text-gray-600 dark:text-gray-300 flex-shrink-0" />
                    )}
                    <span className="font-medium text-slate-900 dark:text-white">
                      {team.team_name}
                    </span>
                  </div>
                </td>
                <td className="py-2 px-3 text-center font-medium text-slate-900 dark:text-white">
                  {team.match_wins}-{team.match_losses}
                </td>
                <td className="py-2 px-3 text-center text-slate-900 dark:text-white">
                  {winPercentage.toFixed(1)}%
                </td>
                <td className="py-2 px-3 text-center font-medium text-slate-900 dark:text-white">
                  {team.game_wins}-{team.game_losses}
                </td>
                <td className="py-2 px-3 text-center text-slate-900 dark:text-white">
                  {gameWinPercentage.toFixed(1)}%
                </td>
                <td className="py-2 px-3 text-center text-slate-900 dark:text-white">
                  {team.power_score?.toFixed(2) || '-'}
                </td>
                <td className="py-2 px-3 text-center text-slate-900 dark:text-white">
                  {team.sos?.toFixed(3) || '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default HistoricalStandingsTable;
