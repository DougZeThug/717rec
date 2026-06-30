import { TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { cn } from '@/lib/utils';
import { typeScale } from '@/styles/design-system';
import { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';
import { formatPowerScore } from '@/utils/colors/powerScoreColors';
import { toTeamSlug } from '@/utils/teamSlug';

import { MoverRowProps } from './weeklyRecapTypes';

function MoverRow({ trend, direction, winter }: MoverRowProps) {
  const isUp = direction === 'up';
  return (
    <Link to={`/teams/${toTeamSlug(trend.teamName)}`} className="flex items-center gap-2 group">
      <TeamLogo imageUrl={trend.logoUrl} teamName={trend.teamName} size="xs" />
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            typeScale.body,
            'font-medium truncate transition-colors block',
            winter
              ? 'text-cyan-50 group-hover:text-cyan-300'
              : 'group-hover:text-violet-600 dark:group-hover:text-violet-400'
          )}
        >
          {trend.teamName}
        </span>
        <span className={cn(typeScale.caption, 'text-muted-foreground tabular-nums block')}>
          {formatPowerScore(trend.previousScore)} → {formatPowerScore(trend.currentScore)}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isUp ? (
          <TrendingUp size={14} className="text-emerald-500" />
        ) : (
          <TrendingDown size={14} className="text-red-500" />
        )}
        <span
          className={cn(
            'text-sm font-semibold tabular-nums',
            isUp ? 'text-emerald-500' : 'text-red-500'
          )}
        >
          {isUp ? '+' : ''}
          {trend.delta.toFixed(1)}
        </span>
      </div>
    </Link>
  );
}

function MoversSection({
  risers,
  faller,
  winter,
}: {
  risers: WeeklyPowerScoreTrend[];
  faller?: WeeklyPowerScoreTrend;
  winter: boolean;
}) {
  const hasMovers = risers.length > 0 || Boolean(faller);
  if (!hasMovers) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <TrendingUp size={13} className="text-emerald-500" />
        <span
          className={cn(
            typeScale.caption,
            'font-semibold uppercase tracking-wider text-muted-foreground'
          )}
        >
          Movers
        </span>
      </div>
      {risers.map((trend) => (
        <MoverRow key={trend.teamId} trend={trend} direction="up" winter={winter} />
      ))}
      {faller && faller.delta < 0 && <MoverRow trend={faller} direction="down" winter={winter} />}
    </section>
  );
}

export default MoversSection;
