import React, { CSSProperties, useCallback } from "react";
import { Crown, Medal, Trophy } from "lucide-react";
import { InlineEmptyState } from "@/components/ui/inline-empty-state";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { getPowerScoreColor, getSosColor } from "@/utils/colors";
import { useSeasonalThemeBase } from "@/hooks/useSeasonalTheme";
import { VirtualizedList } from "@/components/ui/VirtualizedList";
import { useVirtualization } from "@/hooks/useVirtualization";

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

// Mobile row component for virtualized list
const MobileTeamRow: React.FC<{
  team: SeasonData;
  style: CSSProperties;
  isWinterTheme: boolean;
}> = ({ team, style, isWinterTheme }) => {
  const winPercentage = team.match_wins + team.match_losses > 0 
    ? (team.match_wins / (team.match_wins + team.match_losses)) * 100 
    : 0;
  const gameWinPercentage = team.game_wins + team.game_losses > 0 
    ? (team.game_wins / (team.game_wins + team.game_losses)) * 100 
    : 0;

  return (
    <div style={style} className="pb-3">
      <div
        className={cn(
          "rounded-lg p-3 h-full",
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
    </div>
  );
};

// Desktop table row component for virtualized list
const DesktopTeamRow: React.FC<{
  team: SeasonData;
  style: CSSProperties;
  isWinterTheme: boolean;
}> = ({ team, style, isWinterTheme }) => {
  const winPercentage = team.match_wins + team.match_losses > 0 
    ? (team.match_wins / (team.match_wins + team.match_losses)) * 100 
    : 0;
  const gameWinPercentage = team.game_wins + team.game_losses > 0 
    ? (team.game_wins / (team.game_wins + team.game_losses)) * 100 
    : 0;

  return (
    <div 
      style={style}
      className={cn(
        "flex items-center border-b text-sm",
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
      <div className={cn(
        "py-2 px-2 w-14 text-center flex-shrink-0",
        isWinterTheme ? "text-white/60" : "text-gray-600 dark:text-gray-300"
      )}>#{team.playoff_rank || '-'}</div>
      <div className="py-2 px-2 flex-1 min-w-[120px]">
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
            "font-medium truncate",
            isWinterTheme ? "text-white" : "text-slate-900 dark:text-white"
          )}>
            {team.team_name}
          </span>
        </div>
      </div>
      <div className={cn(
        "py-2 px-2 text-center font-medium tabular-nums w-16 flex-shrink-0",
        isWinterTheme ? "text-white" : "text-slate-900 dark:text-white"
      )}>
        {team.match_wins}-{team.match_losses}
      </div>
      <div className={cn("py-2 px-2 text-center font-medium tabular-nums w-16 flex-shrink-0", getWinPercentageColor(winPercentage))}>
        {winPercentage.toFixed(1)}%
      </div>
      <div className={cn(
        "py-2 px-2 text-center font-medium tabular-nums w-16 flex-shrink-0",
        isWinterTheme ? "text-white" : "text-slate-900 dark:text-white"
      )}>
        {team.game_wins}-{team.game_losses}
      </div>
      <div className={cn("py-2 px-2 text-center font-medium tabular-nums w-16 flex-shrink-0", getWinPercentageColor(gameWinPercentage))}>
        {gameWinPercentage.toFixed(1)}%
      </div>
      <div className={cn("py-2 px-2 text-center font-medium tabular-nums w-14 flex-shrink-0", getPowerScoreColor(team.power_score ? team.power_score * 100 : null))}>
        {team.power_score ? (team.power_score * 100).toFixed(1) : '-'}
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

  const renderMobileRow = useCallback((team: SeasonData, _index: number, style: CSSProperties) => (
    <MobileTeamRow 
      key={team.team_id} 
      team={team} 
      style={style} 
      isWinterTheme={isWinterTheme} 
    />
  ), [isWinterTheme]);

  const renderDesktopRow = useCallback((team: SeasonData, _index: number, style: CSSProperties) => (
    <DesktopTeamRow 
      key={team.team_id} 
      team={team} 
      style={style} 
      isWinterTheme={isWinterTheme} 
    />
  ), [isWinterTheme]);

  if (isMobile) {
    if (shouldVirtualize) {
      return (
        <VirtualizedList
          items={teams}
          rowHeight={140}
          height={Math.min(teams.length * 140, 600)}
          renderRow={renderMobileRow}
          overscanCount={3}
        />
      );
    }

    return (
      <div className="space-y-3">
        {teams.map((team) => (
          <MobileTeamRow 
            key={team.team_id} 
            team={team} 
            style={{}} 
            isWinterTheme={isWinterTheme} 
          />
        ))}
      </div>
    );
  }

  // Desktop view
  const tableHeader = (
    <div className={cn(
      "flex items-center border-b text-sm font-medium",
      isWinterTheme ? "border-white/10 text-white/70" : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300"
    )}>
      <div className="py-2 px-2 w-14 text-center flex-shrink-0">Rank</div>
      <div className="py-2 px-2 flex-1 min-w-[120px]">Team</div>
      <div className="py-2 px-2 text-center w-16 flex-shrink-0">W-L</div>
      <div className="py-2 px-2 text-center w-16 flex-shrink-0">Win %</div>
      <div className="py-2 px-2 text-center w-16 flex-shrink-0">Games</div>
      <div className="py-2 px-2 text-center w-16 flex-shrink-0">Game %</div>
      <div className="py-2 px-2 text-center w-14 flex-shrink-0">Power</div>
    </div>
  );

  if (shouldVirtualize) {
    return (
      <div className="overflow-x-auto">
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
    <div className="overflow-x-auto">
      {tableHeader}
      <div>
        {teams.map((team) => (
          <DesktopTeamRow 
            key={team.team_id} 
            team={team} 
            style={{}} 
            isWinterTheme={isWinterTheme} 
          />
        ))}
      </div>
    </div>
  );
};

export default HistoricalStandingsTable;
