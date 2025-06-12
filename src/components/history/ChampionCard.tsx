
import React from "react";
import { Crown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ChampionCardProps {
  team: SeasonData;
}

const ChampionCard: React.FC<ChampionCardProps> = ({ team }) => {
  const winPercentage = team.match_wins + team.match_losses > 0 
    ? (team.match_wins / (team.match_wins + team.match_losses)) * 100 
    : 0;

  return (
    <div className={cn(
      "relative bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20",
      "border-4 border-yellow-400 dark:border-yellow-500",
      "rounded-2xl p-4 mb-4",
      "shadow-lg shadow-yellow-100 dark:shadow-yellow-900/20",
      "overflow-hidden"
    )}>
      {/* Confetti background pattern */}
      <div className="absolute inset-0 opacity-10 dark:opacity-5">
        <div className="absolute top-2 left-4 w-2 h-2 bg-yellow-400 rounded-full"></div>
        <div className="absolute top-8 right-8 w-1 h-1 bg-amber-500 rounded-full"></div>
        <div className="absolute bottom-4 left-8 w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
        <div className="absolute bottom-8 right-4 w-1 h-1 bg-amber-400 rounded-full"></div>
        <div className="absolute top-12 left-1/2 w-1 h-1 bg-yellow-600 rounded-full"></div>
      </div>

      <div className="relative flex items-center gap-4">
        <div className="relative">
          <div className="ring-4 ring-amber-400 dark:ring-amber-500 rounded-lg p-1 bg-white dark:bg-slate-700">
            {team.team_logo_url || team.team_image_url ? (
              <img
                src={team.team_logo_url || team.team_image_url || ''}
                alt={`${team.team_name} logo`}
                className="h-16 w-16 rounded-lg object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-yellow-500" />
              </div>
            )}
          </div>
          <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
            <Crown className="w-4 h-4 text-white" />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300 uppercase tracking-wide">
              Division Champion
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {team.team_name}
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">Record</p>
              <p className="text-slate-900 dark:text-white font-bold">
                {team.match_wins}-{team.match_losses}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">Games</p>
              <p className="text-slate-900 dark:text-white font-bold">
                {team.game_wins}-{team.game_losses}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">Win %</p>
              <p className="text-slate-900 dark:text-white font-bold">
                {winPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChampionCard;
