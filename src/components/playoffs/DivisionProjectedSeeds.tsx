import { ArrowRight } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { useProjectedSeeds } from '@/hooks/playoffs/useProjectedSeeds';
import { formatPowerScore, getPowerScoreColor } from '@/utils/colors/powerScoreColors';

import { NO_BRACKETS_COPY } from './emptyBracketCopy';

interface DivisionProjectedSeedsProps {
  division: string;
  seasonId: string | null;
}

// Same classes `EmptyState` gives its secondary link; that one is module-private.
const seeStandingsClassName =
  'text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1';

/**
 * What a division card shows before its brackets exist.
 *
 * Between the regular season and the playoffs the card used to read "No brackets
 * yet for this division" and stop there. It now lists where the division stands,
 * says when the brackets open, and points at the standings.
 *
 * It owns the whole empty body, including the old sentence, so the card does not
 * have to know whether seeds are available: when there is nothing to show — a
 * past season, a division with no teams, rankings still loading or failed — this
 * falls back to exactly what was there before.
 */
const DivisionProjectedSeeds: React.FC<DivisionProjectedSeedsProps> = ({ division, seasonId }) => {
  const { seedsByDivision, finalWeek, isReady } = useProjectedSeeds(seasonId);
  const seeds = seedsByDivision[division] ?? [];

  if (!isReady || seeds.length === 0) {
    return <p className="text-sm text-muted-foreground mb-3">{NO_BRACKETS_COPY}</p>;
  }

  return (
    <div className="w-full text-left">
      <h4 className="text-sm font-medium mb-1">Projected seeds</h4>
      <p className="text-xs text-muted-foreground mb-3">
        {finalWeek === null
          ? 'Brackets open when the regular season ends.'
          : `Brackets open after week ${finalWeek}.`}{' '}
        The order follows the Power Score today. It can still change.
      </p>

      <ol className="space-y-1 mb-3" aria-label={`${division} projected seeds`}>
        {seeds.map((seed) => (
          <li key={seed.teamId} className="flex items-center gap-2 text-sm min-h-6">
            <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
              {seed.seed}
            </span>
            <span className="min-w-0 flex-1 truncate">{seed.teamName}</span>
            <span
              className={`shrink-0 text-xs tabular-nums ${getPowerScoreColor(seed.powerScore)}`}
            >
              {formatPowerScore(seed.powerScore)}
            </span>
          </li>
        ))}
      </ol>

      <Link to="/stats" className={seeStandingsClassName}>
        See the full standings
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
};

export default DivisionProjectedSeeds;
