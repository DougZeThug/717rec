import { Award, Calendar, Target, TrendingUp } from 'lucide-react';
import React from 'react';

import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { toLocalDateString } from '@/utils/formatDateSafe';

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

/**
 * One "Season Awards" entry: an icon, a label, and the team that won it.
 *
 * The same eleven lines of markup were written out three times, once per award.
 * Extracting them also takes the section under the JSX nesting limit
 * (DeepSource JS-0415).
 */
const AwardItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  isWinterTheme: boolean;
}> = ({ icon, label, value, isWinterTheme }) => (
  <div className="flex items-center gap-2">
    {icon}
    <div>
      <p className={isWinterTheme ? 'text-white/60' : 'text-muted-foreground'}>{label}</p>
      <p className={cn('font-medium', isWinterTheme ? 'text-white' : 'text-foreground')}>{value}</p>
    </div>
  </div>
);

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
        isWinterTheme ? 'bg-white/5 border-white/10' : 'bg-muted border-border'
      )}
    >
      <h5
        className={cn(
          'text-sm font-semibold mb-3 flex items-center gap-2',
          isWinterTheme ? 'text-white/80' : 'text-foreground'
        )}
      >
        <Award className="size-4" />
        Season Awards
      </h5>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <AwardItem
          icon={<Target className="size-4 text-blue-500" />}
          label="Most Wins"
          value={`${mostWins.team_name} (${mostWins.match_wins})`}
          isWinterTheme={isWinterTheme}
        />
        <AwardItem
          icon={<TrendingUp className="size-4 text-green-500" />}
          label="Highest Power Score"
          value={`${highestPowerScore.team_name} (${
            highestPowerScore.power_score ? (highestPowerScore.power_score * 100).toFixed(1) : 'N/A'
          })`}
          isWinterTheme={isWinterTheme}
        />
        <AwardItem
          icon={<Calendar className="size-4 text-purple-500" />}
          label="Most Game Wins"
          value={`${mostGameWins.team_name} (${mostGameWins.game_wins})`}
          isWinterTheme={isWinterTheme}
        />
      </div>

      {season.end_date && (
        <div
          className={cn('mt-3 pt-3 border-t', isWinterTheme ? 'border-white/10' : 'border-border')}
        >
          <p className="text-xs text-muted-foreground">
            Season completed on {toLocalDateString(season.end_date)}
          </p>
        </div>
      )}
    </div>
  );
};

export default SeasonMetaBar;
