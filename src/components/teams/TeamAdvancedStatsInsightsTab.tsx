import { Award, TrendingDown, TrendingUp, Trophy } from 'lucide-react';

import type { TeamAdvancedStats } from '@/hooks/teams/seasonBreakdown';
import { cn } from '@/lib/utils';
import { getPlayoffFinishLabel } from '@/utils/career/calculatePlayoffNarratives';

interface TeamAdvancedStatsInsightsTabProps {
  advancedStats: TeamAdvancedStats;
}

export const TeamAdvancedStatsInsightsTab = ({ advancedStats }: TeamAdvancedStatsInsightsTabProps) => (
  <div className="space-y-4">
    {advancedStats.bestSeason && (
      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={16} className="text-emerald-500" />
          <span className="font-medium text-emerald-400">Best Season</span>
        </div>
        <div className="text-lg font-semibold">{advancedStats.bestSeason.seasonName}</div>
        <div className="text-sm text-muted-foreground">
          {advancedStats.bestSeason.matchWins}-{advancedStats.bestSeason.matchLosses} record
          {advancedStats.bestSeason.isChampion && ' • Champion'}
          {advancedStats.bestSeason.powerScore !== null &&
            ` • ${advancedStats.bestSeason.powerScore.toFixed(1)} Power Score`}
        </div>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {advancedStats.bestDivisionTier && (
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-emerald-500" />
            <span className="font-medium text-sm">Strongest Against</span>
          </div>
          <div className="text-lg font-semibold capitalize">{advancedStats.bestDivisionTier}</div>
        </div>
      )}
      {advancedStats.worstDivisionTier &&
        advancedStats.worstDivisionTier !== advancedStats.bestDivisionTier && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-red-500" />
              <span className="font-medium text-sm">Toughest Matchup</span>
            </div>
            <div className="text-lg font-semibold capitalize">{advancedStats.worstDivisionTier}</div>
          </div>
        )}
    </div>

    {advancedStats.seasons.some((s) => s.isChampion || s.isRunnerUp) && (
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Award size={16} className="text-yellow-500" />
          <span className="font-medium text-sm">Championship History</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {advancedStats.seasons
            .filter((s) => s.isChampion || s.isRunnerUp)
            .map((s) => (
              <div
                key={s.seasonId}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5',
                  s.isChampion ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-500/20 text-slate-400'
                )}
              >
                {s.isChampion ? <Trophy size={12} /> : <Award size={12} />}
                {s.seasonName}
                <span className="text-xs opacity-70">({s.divisionName})</span>
              </div>
            ))}
        </div>
      </div>
    )}

    {advancedStats.seasons.some((s) => s.playoffRank !== null) && (
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={16} className="text-purple-500" />
          <span className="font-medium text-sm">Playoff Journeys</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {advancedStats.seasons
            .filter((s) => s.playoffRank !== null)
            .sort((a, b) => (a.playoffRank || 99) - (b.playoffRank || 99))
            .map((s) => (
              <div
                key={s.seasonId}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5',
                  s.playoffRank === 1
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : s.playoffRank === 2
                      ? 'bg-slate-500/20 text-slate-300'
                      : s.playoffRank === 3
                        ? 'bg-amber-800/20 text-amber-600 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground'
                )}
              >
                {s.playoffRank === 1 && <Trophy size={12} />}
                {s.playoffRank === 2 && <Award size={12} />}
                {getPlayoffFinishLabel(s.playoffRank!)}
                <span className="text-xs opacity-70">
                  {s.seasonName} ({s.divisionName})
                </span>
              </div>
            ))}
        </div>
      </div>
    )}
  </div>
);
