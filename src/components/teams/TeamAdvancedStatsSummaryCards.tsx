import { Minus, Target, TrendingDown, TrendingUp, Trophy, Zap } from 'lucide-react';

import type { TeamAdvancedStats } from '@/hooks/teams/seasonBreakdown';
import { cn } from '@/lib/utils';
import { getPowerScoreColor } from '@/utils/colors';

interface TeamAdvancedStatsSummaryCardsProps {
  advancedStats: TeamAdvancedStats;
}

export const TeamAdvancedStatsSummaryCards = ({
  advancedStats,
}: TeamAdvancedStatsSummaryCardsProps) => {
  const TrendIcon =
    advancedStats.powerScoreTrend === 'improving'
      ? TrendingUp
      : advancedStats.powerScoreTrend === 'declining'
        ? TrendingDown
        : Minus;

  const trendColor =
    advancedStats.powerScoreTrend === 'improving'
      ? 'text-emerald-500'
      : advancedStats.powerScoreTrend === 'declining'
        ? 'text-red-500'
        : 'text-muted-foreground';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2 mb-1">
          <Target size={14} className="text-blue-500" />
          <span className="text-xs text-muted-foreground">Seasons Played</span>
        </div>
        <div className="font-mono text-lg font-semibold">{advancedStats.seasons.length}</div>
      </div>
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={14} className="text-amber-500" />
          <span className="text-xs text-muted-foreground">Avg Power Score</span>
        </div>
        <div
          className={cn(
            'font-mono text-lg font-semibold',
            getPowerScoreColor(advancedStats.averagePowerScore)
          )}
        >
          {advancedStats.averagePowerScore.toFixed(1)}
        </div>
      </div>
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2 mb-1">
          <TrendIcon size={14} className={trendColor} />
          <span className="text-xs text-muted-foreground">Trend</span>
        </div>
        <div className={cn('font-medium text-sm capitalize', trendColor)}>
          {advancedStats.powerScoreTrend}
        </div>
      </div>
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={14} className="text-yellow-500" />
          <span className="text-xs text-muted-foreground">Championships</span>
        </div>
        <div className="font-mono text-lg font-semibold">
          {advancedStats.seasons.filter((s) => s.isChampion).length}
        </div>
      </div>
    </div>
  );
};
