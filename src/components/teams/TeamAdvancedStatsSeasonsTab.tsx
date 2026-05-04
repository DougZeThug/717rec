import type { TeamAdvancedStats } from '@/hooks/teams/seasonBreakdown';

import { SeasonRow } from './SeasonRow';
import { TeamAdvancedStatsSummaryCards } from './TeamAdvancedStatsSummaryCards';

interface TeamAdvancedStatsSeasonsTabProps {
  advancedStats: TeamAdvancedStats;
  expandedSeasons: Set<string>;
  onToggleSeason: (seasonId: string) => void;
}

const tableHeaders = [
  { label: 'Season', className: 'py-2 px-2 md:px-4 font-medium text-muted-foreground' },
  {
    label: 'Record',
    className: 'py-2 px-2 md:px-4 font-medium text-muted-foreground text-center',
  },
  {
    label: 'Games',
    className:
      'py-2 px-2 md:px-4 font-medium text-muted-foreground text-center hidden md:table-cell',
  },
  { label: 'Power', className: 'py-2 px-2 md:px-4 font-medium text-muted-foreground text-center' },
  {
    label: 'Playoff',
    className:
      'py-2 px-2 md:px-4 font-medium text-muted-foreground text-center hidden lg:table-cell',
  },
  {
    label: 'Quality',
    className:
      'py-2 px-2 md:px-4 font-medium text-muted-foreground text-center hidden xl:table-cell',
  },
];

export const TeamAdvancedStatsSeasonsTab = ({
  advancedStats,
  expandedSeasons,
  onToggleSeason,
}: TeamAdvancedStatsSeasonsTabProps) => {
  const seasonRows = advancedStats.seasons.map((season) => (
    <SeasonRow
      key={season.seasonId}
      season={season}
      isExpanded={expandedSeasons.has(season.seasonId)}
      onToggle={() => onToggleSeason(season.seasonId)}
    />
  ));

  return (
    <>
      <TeamAdvancedStatsSummaryCards advancedStats={advancedStats} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {tableHeaders.map((header) => (
                <th key={header.label} className={header.className}>
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{seasonRows}</tbody>
        </table>
      </div>
    </>
  );
};
