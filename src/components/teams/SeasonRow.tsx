import { Award, ChevronDown, ChevronRight, Trophy } from 'lucide-react';

import { cn } from '@/lib/utils';
import { SeasonBreakdown } from '@/types/teamAdvancedStats';
import { getDivisionBadgeColor, getPowerScoreColor } from '@/utils/colors';
import { getWinPercentageColor } from '@/utils/colors/winPercentageColors';

import { DivisionRecordCard } from './DivisionRecordCard';

interface SeasonRowProps {
  season: SeasonBreakdown;
  isExpanded: boolean;
  onToggle: () => void;
}

interface MainSeasonRowProps extends SeasonRowProps {
  hasDivisionRecords: boolean;
}

const ExpansionIcon = ({ isExpanded }: { isExpanded: boolean }) =>
  isExpanded ? (
    <ChevronDown size={14} className="text-muted-foreground" />
  ) : (
    <ChevronRight size={14} className="text-muted-foreground" />
  );

const PlayoffCell = ({ season }: { season: SeasonBreakdown }) => {
  if (season.playoffRank === null) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  return (
    <div className="flex items-center justify-center gap-1">
      {season.isChampion && <Trophy size={14} className="text-yellow-500" />}
      {season.isRunnerUp && <Award size={14} className="text-slate-400" />}
      <span
        className={cn(
          'font-mono text-sm font-medium',
          season.isChampion ? 'text-yellow-500' : season.isTop3 ? 'text-emerald-500' : 'text-foreground'
        )}
      >
        #{season.playoffRank}
      </span>
      <span className="text-xs text-muted-foreground">
        ({season.playoffWins}-{season.playoffLosses})
      </span>
    </div>
  );
};

const MainSeasonRow = ({ season, isExpanded, onToggle, hasDivisionRecords }: MainSeasonRowProps) => (
  <tr
    key={`${season.seasonId}-main`}
    className={cn(
      'border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer',
      isExpanded && 'bg-muted/20'
    )}
    onClick={onToggle}
  >
    <td className="py-3 px-2 md:px-4">
      <div className="flex items-center gap-2">
        {hasDivisionRecords ? <ExpansionIcon isExpanded={isExpanded} /> : <div className="w-[14px]" />}
        <div>
          <div className="font-medium text-sm">{season.seasonName}</div>
          <span className={cn('text-xs px-1.5 py-0.5 rounded border', getDivisionBadgeColor(season.divisionName))}>
            {season.divisionName}
          </span>
        </div>
      </div>
    </td>

    <td className="py-3 px-2 md:px-4 text-center">
      <div className="font-mono text-sm font-medium">
        {season.matchWins}-{season.matchLosses}
      </div>
      <div className={cn('text-xs font-medium', getWinPercentageColor(season.winPct / 100))}>
        {season.winPct.toFixed(0)}%
      </div>
    </td>

    <td className="py-3 px-2 md:px-4 text-center hidden md:table-cell">
      <div className="font-mono text-sm">
        {season.gameWins}-{season.gameLosses}
      </div>
      <div className={cn('text-xs', getWinPercentageColor(season.gameWinPct / 100))}>
        {season.gameWinPct.toFixed(0)}%
      </div>
    </td>

    <td className="py-3 px-2 md:px-4 text-center">
      <div className={cn('font-mono text-sm font-medium', getPowerScoreColor(season.powerScore))}>
        {season.powerScore !== null ? season.powerScore.toFixed(1) : '-'}
      </div>
    </td>

    <td className="py-3 px-2 md:px-4 text-center hidden lg:table-cell">
      <PlayoffCell season={season} />
    </td>

    <td className="py-3 px-2 md:px-4 text-center hidden xl:table-cell">
      <div className="text-xs">
        <span className="font-medium">{season.sweeps}</span>
        <span className="text-muted-foreground"> sweeps</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {season.closeWins}W / {season.closeLosses}L close
      </div>
    </td>
  </tr>
);

export const SeasonRow = ({ season, isExpanded, onToggle }: SeasonRowProps) => {
  const divisionCards = [
    { tier: 'competitive' as const, record: season.divisionRecords.competitive },
    { tier: 'intermediate' as const, record: season.divisionRecords.intermediate },
    { tier: 'recreational' as const, record: season.divisionRecords.recreational },
  ];
  const visibleDivisionCards = divisionCards.filter(({ record }) => record.wins + record.losses > 0);
  const hasDivisionRecords = visibleDivisionCards.length > 0;

  return [
    <MainSeasonRow
      key={`${season.seasonId}-main-wrapper`}
      season={season}
      isExpanded={isExpanded}
      onToggle={onToggle}
      hasDivisionRecords={hasDivisionRecords}
    />,
    isExpanded && hasDivisionRecords ? (
      <tr key={`${season.seasonId}-expanded`} className="bg-muted/10">
        <td colSpan={6} className="py-2 px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {visibleDivisionCards.map(({ tier, record }) => (
              <DivisionRecordCard key={tier} tier={tier} record={record} />
            ))}
          </div>
        </td>
      </tr>
    ) : null,
  ];
};
