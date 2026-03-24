import { Gauge, Trophy } from 'lucide-react';
import React from 'react';

import RankTrendIndicator from '@/components/stats/RankTrendIndicator';
import { PowerScoreDisplay } from '@/components/ui/PowerScoreDisplay';
import { cn } from '@/lib/utils';

interface TeamPerformanceCardsProps {
  powerScore: number;
  rank?: number;
  totalTeams?: number;
  rankChange?: number;
  wins: number;
  losses: number;
}

const TeamPerformanceCards: React.FC<TeamPerformanceCardsProps> = ({
  powerScore,
  rank,
  totalTeams,
  rankChange,
  wins,
  losses,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Power Score Card */}
      <div className="rounded-xl border border-border bg-card p-3 flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
          <Gauge className="h-3.5 w-3.5" />
          Power Score
        </div>
        <PowerScoreDisplay
          score={powerScore}
          source="v_team_details"
          display="gauge"
          size="sm"
          showLabel={false}
        />
        <span className="text-xs text-muted-foreground font-medium">
          {wins}-{losses} Record
        </span>
      </div>

      {/* Ranking Card */}
      <div className="rounded-xl border border-border bg-card p-3 flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
          <Trophy className="h-3.5 w-3.5" />
          Ranking
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={cn(
              'text-3xl font-bebas tracking-wide',
              rank && rank <= 3
                ? 'text-amber-500'
                : rank && rank <= 10
                  ? 'text-primary'
                  : 'text-foreground'
            )}
          >
            {rank ?? '—'}
          </span>
          {totalTeams && (
            <span className="text-lg text-muted-foreground font-bebas">/ {totalTeams}</span>
          )}
        </div>
        {rankChange !== undefined && (
          <div className="scale-90">
            <RankTrendIndicator rankChange={rankChange} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamPerformanceCards;
