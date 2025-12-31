
import React from "react";
import { Crown, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { getPowerScoreColor, getSosColor } from "@/utils/colors";
import { useSeasonalThemeBase } from "@/hooks/useSeasonalTheme";

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

interface HistoricalStandingsTableProps {
  teams: SeasonData[];
}

const getWinPercentageColor = (percentage: number): string => {
  if (percentage >= 75) return 'text-green-600 dark:text-green-500';
  if (percentage >= 60) return 'text-blue-600 dark:text-blue-500';
  if (percentage >= 40) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-500';
};

const HistoricalStandingsTable: React.FC<HistoricalStandingsTableProps> = ({ teams }) => {
  const isMobile = useIsMobile();
  const { isWinterTheme } = useSeasonalThemeBase();

  if (isMobile) {
    return (
      <div className="space-y-3">
        {teams.map((team) => {
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
                "rounded-lg p-3",
                isWinterTheme 
                  ? cn(
                      "bg-white/5 border border-white/10",
                      team.champion && "ring-2 ring-yellow-400/50 bg-yellow-500/10",
                      team.runner_up && "ring-2 ring-gray-400/50 bg-white/10"
                    )
                  : cn(
                      "bg-gray-50 dark:bg-slate-700/50",
                      team.champion && "ring-2 ring-yellow-400 dark:ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
                      team.runner_up && "ring-2 ring-gray-400 dark:ring-gray-500 bg-gray-100 dark:bg-gray-900/20"
                    )
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium w-6",
                    isWinterTheme ? "text-white/60" : "text-gray-500 dark:text-gray-400"
                  )}>
                    #{team.playoff_rank || '-'}
                  </span>
                  {team.champion && (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  )}
                  {team.runner_up && (
                    <Medal className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  )}
                  <TeamLogo
                    imageUrl={team.team_logo_url || team.team_image_url}
                    teamName={team.team_name}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <span className={cn(
                    "font-semibold",
                    isWinterTheme ? "text-white" : "text-slate-900 dark:text-white"
                  )}>
                    {team.team_name}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className={isWinterTheme ? "text-white/70" : "text-gray-600 dark:text-gray-300"}>Record:</span>
                  <span className={cn("ml-2 font-medium tabular-nums", getWinPercentageColor(winPercentage))}>
                    {team.match_wins}-{team.match_losses} ({winPercentage.toFixed(1)}%)
                  </span>
                </div>
                <div>
                  <span className={isWinterTheme ? "text-white/70" : "text-gray-600 dark:text-gray-300"}>Games:</span>
                  <span className={cn("ml-2 font-medium tabular-nums", getWinPercentageColor(gameWinPercentage))}>
                    {team.game_wins}-{team.game_losses} ({gameWinPercentage.toFixed(1)}%)
                  </span>
                </div>
                {team.power_score !== null && (
                  <div>
                    <span className={isWinterTheme ? "text-white/70" : "text-gray-600 dark:text-gray-300"}>Power Score:</span>
                    <span className={cn("ml-2 font-medium tabular-nums", getPowerScoreColor(team.power_score * 100))}>
                      {(team.power_score * 100).toFixed(1)}
                    </span>
                  </div>
                )}
                {team.sos !== null && (
                  <div>
                    <span className={isWinterTheme ? "text-white/70" : "text-gray-600 dark:text-gray-300"}>SOS:</span>
                    <span className={cn("ml-2 font-medium tabular-nums", getSosColor(team.sos))}>
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
          <tr className={cn(
            "border-b",
            isWinterTheme ? "border-white/10" : "border-gray-200 dark:border-slate-600"
          )}>
            <th className={cn(
              "text-left py-2 px-3 font-medium",
              isWinterTheme ? "text-white/70" : "text-gray-600 dark:text-gray-300"
            )}>Rank</th>
            <th className={cn(
              "text-left py-2 px-3 font-medium",
              isWinterTheme ? "text-white/70" : "text-gray-600 dark:text-gray-300"
            )}>Team</th>
            <th className={cn(
              "text-center py-2 px-3 font-medium",
              isWinterTheme ? "text-white/70" : "text-gray-600 dark:text-gray-300"
            )}>W-L</th>
            <th className={cn(
              "text-center py-2 px-3 font-medium",
              isWinterTheme ? "text-white/70" : "text-gray-600 dark:text-gray-300"
            )}>Win %</th>
            <th className={cn(
              "text-center py-2 px-3 font-medium",
              isWinterTheme ? "text-white/70" : "text-gray-600 dark:text-gray-300"
            )}>Games</th>
            <th className={cn(
              "text-center py-2 px-3 font-medium",
              isWinterTheme ? "text-white/70" : "text-gray-600 dark:text-gray-300"
            )}>Game %</th>
            <th className={cn(
              "text-center py-2 px-3 font-medium",
              isWinterTheme ? "text-white/70" : "text-gray-600 dark:text-gray-300"
            )}>Power</th>
            <th className={cn(
              "text-center py-2 px-3 font-medium",
              isWinterTheme ? "text-white/70" : "text-gray-600 dark:text-gray-300"
            )}>SOS</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => {
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
                  "border-b",
                  isWinterTheme 
                    ? cn(
                        "border-white/5 hover:bg-white/5",
                        team.champion && "bg-yellow-500/10 hover:bg-yellow-500/15",
                        team.runner_up && "bg-white/5 hover:bg-white/10"
                      )
                    : cn(
                        "border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50",
                        team.champion && "bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
                        team.runner_up && "bg-gray-100 dark:bg-gray-900/20 hover:bg-gray-200 dark:hover:bg-gray-900/30"
                      )
                )}
              >
                <td className={cn(
                  "py-2 px-3",
                  isWinterTheme ? "text-white/60" : "text-gray-600 dark:text-gray-300"
                )}>#{team.playoff_rank || '-'}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    {team.champion && (
                      <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    )}
                    {team.runner_up && (
                      <Medal className="w-4 h-4 text-gray-600 dark:text-gray-300 flex-shrink-0" />
                    )}
                    <TeamLogo
                      imageUrl={team.team_logo_url || team.team_image_url}
                      teamName={team.team_name}
                      size="sm"
                      className="flex-shrink-0"
                    />
                    <span className={cn(
                      "font-medium",
                      isWinterTheme ? "text-white" : "text-slate-900 dark:text-white"
                    )}>
                      {team.team_name}
                    </span>
                  </div>
                </td>
                <td className={cn(
                  "py-2 px-3 text-center font-medium tabular-nums",
                  isWinterTheme ? "text-white" : "text-slate-900 dark:text-white"
                )}>
                  {team.match_wins}-{team.match_losses}
                </td>
                <td className={cn("py-2 px-3 text-center font-medium tabular-nums", getWinPercentageColor(winPercentage))}>
                  {winPercentage.toFixed(1)}%
                </td>
                <td className={cn(
                  "py-2 px-3 text-center font-medium tabular-nums",
                  isWinterTheme ? "text-white" : "text-slate-900 dark:text-white"
                )}>
                  {team.game_wins}-{team.game_losses}
                </td>
                <td className={cn("py-2 px-3 text-center font-medium tabular-nums", getWinPercentageColor(gameWinPercentage))}>
                  {gameWinPercentage.toFixed(1)}%
                </td>
                <td className={cn("py-2 px-3 text-center font-medium tabular-nums", getPowerScoreColor(team.power_score ? team.power_score * 100 : null))}>
                  {team.power_score ? (team.power_score * 100).toFixed(1) : '-'}
                </td>
                <td className={cn("py-2 px-3 text-center font-medium tabular-nums", getSosColor(team.sos))}>
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
