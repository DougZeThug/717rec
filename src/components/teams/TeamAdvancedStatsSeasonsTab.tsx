import type { TeamAdvancedStats } from '@/hooks/teams/seasonBreakdown';

import { SeasonRow } from './SeasonRow';
import { TeamAdvancedStatsSummaryCards } from './TeamAdvancedStatsSummaryCards';

interface TeamAdvancedStatsSeasonsTabProps {
  advancedStats: TeamAdvancedStats;
  expandedSeasons: Set<string>;
  onToggleSeason: (seasonId: string) => void;
}

export const TeamAdvancedStatsSeasonsTab = ({
  advancedStats,
  expandedSeasons,
  onToggleSeason,
}: TeamAdvancedStatsSeasonsTabProps) => (
  <>
    <TeamAdvancedStatsSummaryCards advancedStats={advancedStats} />

    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 px-2 md:px-4 font-medium text-muted-foreground">Season</th>
            <th className="py-2 px-2 md:px-4 font-medium text-muted-foreground text-center">Record</th>
            <th className="py-2 px-2 md:px-4 font-medium text-muted-foreground text-center hidden md:table-cell">
              Games
            </th>
            <th className="py-2 px-2 md:px-4 font-medium text-muted-foreground text-center">Power</th>
            <th className="py-2 px-2 md:px-4 font-medium text-muted-foreground text-center hidden lg:table-cell">
              Playoff
            </th>
            <th className="py-2 px-2 md:px-4 font-medium text-muted-foreground text-center hidden xl:table-cell">
              Quality
            </th>
          </tr>
        </thead>
        <tbody>
          {advancedStats.seasons.map((season) => (
            <SeasonRow
              key={season.seasonId}
              season={season}
              isExpanded={expandedSeasons.has(season.seasonId)}
              onToggle={() => onToggleSeason(season.seasonId)}
            />
          ))}
        </tbody>
      </table>
    </div>
  </>
);
