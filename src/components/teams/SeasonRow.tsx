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

export const SeasonRow = ({ season, isExpanded, onToggle }: SeasonRowProps) => {
  const hasDivisionRecords =
    season.divisionRecords.competitive.wins + season.divisionRecords.competitive.losses > 0 ||
    season.divisionRecords.intermediate.wins + season.divisionRecords.intermediate.losses > 0 ||
    season.divisionRecords.recreational.wins + season.divisionRecords.recreational.losses > 0;

  return (
    <>
      <tr
        className={cn(
          'border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer',
          isExpanded && 'bg-muted/20'
        )}
        onClick={onToggle}
      >
        <td className="py-3 px-2 md:px-4">
          <div className="flex items-center gap-2">
            {hasDivisionRecords ? (
              isExpanded ? (
                <ChevronDown size={14} className="text-muted-foreground" />
              ) : (
                <ChevronRight size={14} className="text-muted-foreground" />
              )
            ) : (
              <div className="w-[14px]" />
            )}
            <div>
              <div className="font-medium text-sm">{season.seasonName}</div>
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded border',
                  getDivisionBadgeColor(season.divisionName)
                )}
              >
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
          {season.playoffRank !== null ? (
            <div className="flex items-center justify-center gap-1">
              {season.isChampion && <Trophy size={14} className="text-yellow-500" />}
              {season.isRunnerUp && <Award size={14} className="text-slate-400" />}
              <span
                className={cn(
                  'font-mono text-sm font-medium',
                  season.isChampion
                    ? 'text-yellow-500'
                    : season.isTop3
                      ? 'text-emerald-500'
                      : 'text-foreground'
                )}
              >
                #{season.playoffRank}
              </span>
              <span className="text-xs text-muted-foreground">
                ({season.playoffWins}-{season.playoffLosses})
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
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

      {isExpanded && hasDivisionRecords && (
        <tr className="bg-muted/10">
          <td colSpan={6} className="py-2 px-4 md:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {season.divisionRecords.competitive.wins + season.divisionRecords.competitive.losses >
                0 && (
                <DivisionRecordCard tier="competitive" record={season.divisionRecords.competitive} />
              )}
              {season.divisionRecords.intermediate.wins + season.divisionRecords.intermediate.losses >
                0 && (
                <DivisionRecordCard
                  tier="intermediate"
                  record={season.divisionRecords.intermediate}
                />
              )}
              {season.divisionRecords.recreational.wins + season.divisionRecords.recreational.losses >
                0 && (
                <DivisionRecordCard
                  tier="recreational"
                  record={season.divisionRecords.recreational}
                />
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
