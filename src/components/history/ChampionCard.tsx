import { Crown, Trophy } from 'lucide-react';
import React from 'react';

import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { getPowerScoreColor, getSosColor } from '@/utils/colors';

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

const getWinPercentageColor = (percentage: number): string => {
  if (percentage >= 75) return 'text-green-600 dark:text-green-500';
  if (percentage >= 60) return 'text-blue-600 dark:text-blue-500';
  if (percentage >= 40) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-500';
};

const ChampionCard: React.FC<ChampionCardProps> = ({ team }) => {
  const { isWinterTheme } = useSeasonalThemeBase();
  const winPercentage =
    team.match_wins + team.match_losses > 0
      ? (team.match_wins / (team.match_wins + team.match_losses)) * 100
      : 0;

  return (
    <div
      className={cn(
        'relative rounded-2xl p-4 mb-4 overflow-hidden',
        isWinterTheme
          ? 'bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border-2 border-yellow-400/50 shadow-lg shadow-yellow-500/10'
          : cn(
              'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20',
              'border-4 border-yellow-400 dark:border-yellow-500',
              'shadow-lg shadow-yellow-100 dark:shadow-yellow-900/20'
            )
      )}
    >
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
          <div
            className={cn(
              'ring-4 rounded-lg p-1',
              isWinterTheme
                ? 'ring-amber-400/50 bg-slate-800/80'
                : 'ring-amber-400 dark:ring-amber-500 bg-white dark:bg-slate-700'
            )}
          >
            {team.team_image_url || team.team_logo_url ? (
              <img
                src={team.team_image_url || team.team_logo_url || ''}
                alt={`${team.team_name} logo`}
                className="h-16 w-16 rounded-lg object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div
                className={cn(
                  'h-16 w-16 rounded-lg flex items-center justify-center',
                  isWinterTheme ? 'bg-slate-700/80' : 'bg-gray-100 dark:bg-gray-800'
                )}
              >
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
            <span
              className={cn(
                'text-sm font-medium uppercase tracking-wide',
                isWinterTheme ? 'text-yellow-300' : 'text-yellow-700 dark:text-yellow-300'
              )}
            >
              Division Champion
            </span>
          </div>
          <h3
            className={cn(
              'text-xl font-bold mb-2',
              isWinterTheme ? 'text-white' : 'text-slate-900 dark:text-white'
            )}
          >
            {team.team_name}
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className={isWinterTheme ? 'text-white/70' : 'text-gray-600 dark:text-gray-300'}>
                Record
              </p>
              <p
                className={cn(
                  'font-bold',
                  isWinterTheme ? 'text-white' : 'text-slate-900 dark:text-white'
                )}
              >
                {team.match_wins}-{team.match_losses}
              </p>
            </div>
            <div>
              <p className={isWinterTheme ? 'text-white/70' : 'text-gray-600 dark:text-gray-300'}>
                Games
              </p>
              <p
                className={cn(
                  'font-bold',
                  isWinterTheme ? 'text-white' : 'text-slate-900 dark:text-white'
                )}
              >
                {team.game_wins}-{team.game_losses}
              </p>
            </div>
            <div>
              <p className={isWinterTheme ? 'text-white/70' : 'text-gray-600 dark:text-gray-300'}>
                Win %
              </p>
              <p className={cn('font-bold', getWinPercentageColor(winPercentage))}>
                {winPercentage.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Additional stats if available */}
          {(team.power_score !== null || team.sos !== null) && (
            <div
              className={cn(
                'grid grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t',
                isWinterTheme
                  ? 'border-yellow-400/30'
                  : 'border-yellow-200 dark:border-yellow-700/50'
              )}
            >
              {team.power_score !== null && (
                <div>
                  <p
                    className={isWinterTheme ? 'text-white/70' : 'text-gray-600 dark:text-gray-300'}
                  >
                    Power Score
                  </p>
                  <p className={cn('font-bold', getPowerScoreColor(team.power_score * 100))}>
                    {(team.power_score * 100).toFixed(1)}
                  </p>
                </div>
              )}
              {team.sos !== null && (
                <div>
                  <p
                    className={isWinterTheme ? 'text-white/70' : 'text-gray-600 dark:text-gray-300'}
                  >
                    SOS
                  </p>
                  <p className={cn('font-bold', getSosColor(team.sos))}>{team.sos.toFixed(3)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChampionCard;
