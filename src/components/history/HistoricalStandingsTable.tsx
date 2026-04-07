import { Crown, Medal, Trophy } from 'lucide-react';
import React, { CSSProperties, useCallback } from 'react';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { EntityCard } from '@/components/ui/entity-card';
import { InlineEmptyState } from '@/components/ui/inline-empty-state';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useIsMobile } from '@/hooks/useMobile';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { useVirtualization } from '@/hooks/useVirtualization';
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

// Mobile row component — EntityCard based
const MobileTeamRow: React.FC<{
  team: SeasonData;
  style: CSSProperties;
  isWinterTheme: boolean;
}> = ({ team, style, isWinterTheme }) => {
  const winPercentage =
    team.match_wins + team.match_losses > 0
      ? (team.match_wins / (team.match_wins + team.match_losses)) * 100
      : 0;
  const gameWinPercentage =
    team.game_wins + team.game_losses > 0
      ? (team.game_wins / (team.game_wins + team.game_losses)) * 100
      : 0;

  return (
    <div style={style} className="pb-2">
      <EntityCard
        isInteractive={false}
        withGradient={!isWinterTheme}
        className={cn(
          'p-3',
          team.champion && 'border-l-[3px] border-l-yellow-400',
          team.runner_up && 'border-l-[3px] border-l-gray-400'
        )}
      >
        {/* Header row: rank + badge + logo + name + record */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-xs font-semibold tabular-nums w-5 text-center flex-shrink-0',
              isWinterTheme ? 'text-white/50' : 'text-muted-foreground'
            )}
          >
            {team.playoff_rank || '-'}
          </span>
          {team.champion && <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
          {team.runner_up && <Medal className="w-4 h-4 text-gray-500 flex-shrink-0" />}
          <TeamLogo
            imageUrl={team.team_image_url || team.team_logo_url}
            teamName={team.team_name}
            size="sm"
            className="flex-shrink-0"
          />
          <span
            className={cn(
              'font-semibold text-sm truncate',
              isWinterTheme ? 'text-white' : 'text-foreground'
            )}
          >
            {team.team_name}
          </span>
          <span
            className={cn(
              'ml-auto font-bold text-sm tabular-nums flex-shrink-0',
              isWinterTheme ? 'text-white' : 'text-foreground'
            )}
          >
            {team.match_wins}-{team.match_losses}
          </span>
        </div>

        {/* Compact 2x2 stat grid */}
        <div className="grid grid-cols-4 gap-1 mt-2">
          <StatCell
            label="Win%"
            value={`${winPercentage.toFixed(1)}%`}
            colorClass={getWinPercentageColor(winPercentage)}
            isWinterTheme={isWinterTheme}
          />
          <StatCell
            label="GW%"
            value={`${gameWinPercentage.toFixed(1)}%`}
            colorClass={getWinPercentageColor(gameWinPercentage)}
            isWinterTheme={isWinterTheme}
          />
          <StatCell
            label="Power"
            value={team.power_score ? (team.power_score * 100).toFixed(1) : '-'}
            colorClass={getPowerScoreColor(team.power_score ? team.power_score * 100 : null)}
            isWinterTheme={isWinterTheme}
          />
          <StatCell
            label="SOS"
            value={team.sos?.toFixed(3) ?? '-'}
            colorClass={getSosColor(team.sos)}
            isWinterTheme={isWinterTheme}
          />
        </div>
      </EntityCard>
    </div>
  );
};

// Small stat cell for mobile grid
const StatCell: React.FC<{
  label: string;
  value: string;
  colorClass: string;
  isWinterTheme: boolean;
}> = ({ label, value, colorClass, isWinterTheme }) => (
  <div className="flex flex-col items-center">
    <span
      className={cn(
        'text-[10px] leading-tight',
        isWinterTheme ? 'text-white/50' : 'text-muted-foreground'
      )}
    >
      {label}
    </span>
    <span className={cn('text-xs font-semibold tabular-nums', colorClass)}>{value}</span>
  </div>
);

// Desktop table row component
const DesktopTeamRow: React.FC<{
  team: SeasonData;
  style: CSSProperties;
  isWinterTheme: boolean;
}> = ({ team, style, isWinterTheme }) => {
  const winPercentage =
    team.match_wins + team.match_losses > 0
      ? (team.match_wins / (team.match_wins + team.match_losses)) * 100
      : 0;
  const gameWinPercentage =
    team.game_wins + team.game_losses > 0
      ? (team.game_wins / (team.game_wins + team.game_losses)) * 100
      : 0;

  return (
    <div
      style={style}
      className={cn(
        'flex items-center text-sm transition-colors duration-150 rounded-md mx-1 my-0.5',
        isWinterTheme
          ? cn(
              'hover:bg-white/5',
              team.champion && 'bg-yellow-500/10 hover:bg-yellow-500/15 border-l-[3px] border-l-yellow-400',
              team.runner_up && 'bg-white/5 hover:bg-white/10 border-l-[3px] border-l-gray-400',
              !team.champion && !team.runner_up && 'border-l-[3px] border-l-transparent'
            )
          : cn(
              'hover:bg-accent/50',
              team.champion &&
                'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border-l-[3px] border-l-yellow-400',
              team.runner_up &&
                'bg-muted/50 hover:bg-muted border-l-[3px] border-l-gray-400',
              !team.champion && !team.runner_up && 'border-l-[3px] border-l-transparent'
            )
      )}
    >
      <div
        className={cn(
          'py-2 px-2 w-14 text-center flex-shrink-0 tabular-nums',
          isWinterTheme ? 'text-white/60' : 'text-muted-foreground'
        )}
      >
        {team.playoff_rank || '-'}
      </div>
      <div className="py-2 px-2 flex-1 min-w-[120px]">
        <div className="flex items-center gap-2">
          {team.champion && <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
          {team.runner_up && (
            <Medal className="w-4 h-4 text-gray-500 flex-shrink-0" />
          )}
          <TeamLogo
            imageUrl={team.team_image_url || team.team_logo_url}
            teamName={team.team_name}
            size="sm"
            className="flex-shrink-0"
          />
          <span
            className={cn(
              'font-medium truncate',
              isWinterTheme ? 'text-white' : 'text-foreground'
            )}
          >
            {team.team_name}
          </span>
        </div>
      </div>
      <div
        className={cn(
          'py-2 px-2 text-center font-semibold tabular-nums w-16 flex-shrink-0',
          isWinterTheme ? 'text-white' : 'text-foreground'
        )}
      >
        {team.match_wins}-{team.match_losses}
      </div>
      <div
        className={cn(
          'py-2 px-2 text-center font-medium tabular-nums w-16 flex-shrink-0',
          getWinPercentageColor(winPercentage)
        )}
      >
        {winPercentage.toFixed(1)}%
      </div>
      <div
        className={cn(
          'py-2 px-2 text-center tabular-nums w-16 flex-shrink-0',
          isWinterTheme ? 'text-white/80' : 'text-muted-foreground'
        )}
      >
        {team.game_wins}-{team.game_losses}
      </div>
      <div
        className={cn(
          'py-2 px-2 text-center font-medium tabular-nums w-16 flex-shrink-0',
          getWinPercentageColor(gameWinPercentage)
        )}
      >
        {gameWinPercentage.toFixed(1)}%
      </div>
      <div
        className={cn(
          'py-2 px-2 text-center font-medium tabular-nums w-14 flex-shrink-0',
          getPowerScoreColor(team.power_score ? team.power_score * 100 : null)
        )}
      >
        {team.power_score ? (team.power_score * 100).toFixed(1) : '-'}
      </div>
      <div
        className={cn(
          'py-2 px-2 text-center font-medium tabular-nums w-16 flex-shrink-0',
          getSosColor(team.sos)
        )}
      >
        {team.sos?.toFixed(3) || '-'}
      </div>
    </div>
  );
};

const HistoricalStandingsTable: React.FC<HistoricalStandingsTableProps> = ({ teams }) => {
  const isMobile = useIsMobile();
  const { isWinterTheme } = useSeasonalThemeBase();
  const { shouldVirtualize } = useVirtualization({ itemCount: teams.length, threshold: 30 });

  if (teams.length === 0) {
    return (
      <InlineEmptyState
        icon={Trophy}
        message="No Standings Available"
        description="Team standings will appear once match data is recorded for this season."
      />
    );
  }

  const renderMobileRow = useCallback(
    (team: SeasonData, _index: number, style: CSSProperties) => (
      <MobileTeamRow key={team.team_id} team={team} style={style} isWinterTheme={isWinterTheme} />
    ),
    [isWinterTheme]
  );

  const renderDesktopRow = useCallback(
    (team: SeasonData, _index: number, style: CSSProperties) => (
      <DesktopTeamRow key={team.team_id} team={team} style={style} isWinterTheme={isWinterTheme} />
    ),
    [isWinterTheme]
  );

  if (isMobile) {
    if (shouldVirtualize) {
      return (
        <VirtualizedList
          items={teams}
          rowHeight={110}
          height={Math.min(teams.length * 110, 600)}
          renderRow={renderMobileRow}
          overscanCount={3}
        />
      );
    }

    return (
      <div className="space-y-2">
        {teams.map((team) => (
          <MobileTeamRow key={team.team_id} team={team} style={{}} isWinterTheme={isWinterTheme} />
        ))}
      </div>
    );
  }

  // Desktop view
  const tableHeader = (
    <div
      className={cn(
        'flex items-center text-xs font-semibold uppercase tracking-wider rounded-t-lg px-1',
        isWinterTheme
          ? 'border-b border-white/10 text-white/50 bg-white/5'
          : 'border-b border-border text-muted-foreground bg-muted/30'
      )}
    >
      <div className="py-2.5 px-2 w-14 text-center flex-shrink-0">Rank</div>
      <div className="py-2.5 px-2 flex-1 min-w-[120px]">Team</div>
      <div className="py-2.5 px-2 text-center w-16 flex-shrink-0">W-L</div>
      <div className="py-2.5 px-2 text-center w-16 flex-shrink-0">Win%</div>
      <div className="py-2.5 px-2 text-center w-16 flex-shrink-0">Games</div>
      <div className="py-2.5 px-2 text-center w-16 flex-shrink-0">Game%</div>
      <div className="py-2.5 px-2 text-center w-14 flex-shrink-0">Power</div>
      <div className="py-2.5 px-2 text-center w-16 flex-shrink-0">SOS</div>
    </div>
  );

  if (shouldVirtualize) {
    return (
      <div
        className={cn(
          'overflow-x-auto rounded-lg border',
          isWinterTheme ? 'border-white/10' : 'border-border'
        )}
      >
        {tableHeader}
        <VirtualizedList
          items={teams}
          rowHeight={44}
          height={Math.min(teams.length * 44, 500)}
          renderRow={renderDesktopRow}
          overscanCount={5}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'overflow-x-auto rounded-lg border',
        isWinterTheme ? 'border-white/10' : 'border-border'
      )}
    >
      {tableHeader}
      <div>
        {teams.map((team) => (
          <DesktopTeamRow key={team.team_id} team={team} style={{}} isWinterTheme={isWinterTheme} />
        ))}
      </div>
    </div>
  );
};

export default React.memo(HistoricalStandingsTable);
