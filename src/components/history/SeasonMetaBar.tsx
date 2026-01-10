import { Award, Calendar, Target, TrendingUp } from 'lucide-react';
import React from 'react';

import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

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

interface SeasonMetaBarProps {
  season: Season;
  seasonData: SeasonData[];
}

const SeasonMetaBar: React.FC<SeasonMetaBarProps> = ({ season, seasonData }) => {
  const { isWinterTheme } = useSeasonalThemeBase();

  // Calculate season awards
  const mostWins = seasonData.reduce(
    (max, team) => (team.match_wins > max.match_wins ? team : max),
    seasonData[0] || { match_wins: 0, team_name: 'N/A' }
  );

  const highestPowerScore = seasonData.reduce(
    (max, team) => ((team.power_score || 0) > (max.power_score || 0) ? team : max),
    seasonData[0] || { power_score: 0, team_name: 'N/A' }
  );

  const mostGameWins = seasonData.reduce(
    (max, team) => (team.game_wins > max.game_wins ? team : max),
    seasonData[0] || { game_wins: 0, team_name: 'N/A' }
  );

  if (seasonData.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-xl p-4 border',
        isWinterTheme
          ? 'bg-white/5 border-white/10'
          : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600'
      )}
    >
      <h5
        className={cn(
          'text-sm font-semibold mb-3 flex items-center gap-2',
          isWinterTheme ? 'text-white/80' : 'text-gray-700 dark:text-gray-300'
        )}
      >
        <Award className="w-4 h-4" />
        Season Awards
      </h5>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-500" />
          <div>
            <p className={isWinterTheme ? 'text-white/60' : 'text-gray-600 dark:text-gray-400'}>
              Most Wins
            </p>
            <p
              className={cn(
                'font-medium',
                isWinterTheme ? 'text-white' : 'text-slate-900 dark:text-white'
              )}
            >
              {mostWins.team_name} ({mostWins.match_wins})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <div>
            <p className={isWinterTheme ? 'text-white/60' : 'text-gray-600 dark:text-gray-400'}>
              Highest Power Score
            </p>
            <p
              className={cn(
                'font-medium',
                isWinterTheme ? 'text-white' : 'text-slate-900 dark:text-white'
              )}
            >
              {highestPowerScore.team_name} (
              {highestPowerScore.power_score
                ? (highestPowerScore.power_score * 100).toFixed(1)
                : 'N/A'}
              )
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-500" />
          <div>
            <p className={isWinterTheme ? 'text-white/60' : 'text-gray-600 dark:text-gray-400'}>
              Most Game Wins
            </p>
            <p
              className={cn(
                'font-medium',
                isWinterTheme ? 'text-white' : 'text-slate-900 dark:text-white'
              )}
            >
              {mostGameWins.team_name} ({mostGameWins.game_wins})
            </p>
          </div>
        </div>
      </div>

      {season.end_date && (
        <div
          className={cn(
            'mt-3 pt-3 border-t',
            isWinterTheme ? 'border-white/10' : 'border-gray-200 dark:border-slate-600'
          )}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Season completed on {new Date(season.end_date).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default SeasonMetaBar;
