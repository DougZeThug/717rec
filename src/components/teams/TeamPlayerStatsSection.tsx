import { Target } from 'lucide-react';
import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { LoadingState } from '@/components/ui/loading-state';
import { useTeamPlayerSeasonStats } from '@/hooks/live-scoring/useTeamPlayerSeasonStats';
import { cn } from '@/lib/utils';
import {
  differentialPerRound,
  formatPercent,
  formatRatio,
  percentage,
  pointsPerRound,
} from '@/utils/liveScoring/pprCalc';

interface PlayerStatRow {
  player_id: string | null;
  display_name: string | null;
  rounds_thrown: number | null;
  points_for: number | null;
  points_against: number | null;
  bags_in: number | null;
  bags_on: number | null;
  bags_off: number | null;
  four_baggers: number | null;
  game_wins: number | null;
  game_losses: number | null;
}

const PlayerStatCard: React.FC<{ row: PlayerStatRow }> = ({ row }) => {
  const rounds = row.rounds_thrown ?? 0;
  const ppr = pointsPerRound(row.points_for ?? 0, rounds);
  const dpr = differentialPerRound(row.points_for ?? 0, row.points_against ?? 0, rounds);
  const totalBags = (row.bags_in ?? 0) + (row.bags_on ?? 0) + (row.bags_off ?? 0);
  const holePct = percentage(row.bags_in ?? 0, totalBags);
  const boardPct = percentage(row.bags_on ?? 0, totalBags);
  const offPct = percentage(row.bags_off ?? 0, totalBags);

  const dprColor =
    dpr === null
      ? 'text-muted-foreground'
      : dpr >= 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-destructive';
  const dprLabel = dpr === null ? '–' : `${dpr >= 0 ? '+' : ''}${dpr.toFixed(2)}`;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-semibold truncate">{row.display_name ?? 'Unknown player'}</div>
          <div className="text-xs text-muted-foreground tabular-nums shrink-0">
            {rounds} round{rounds === 1 ? '' : 's'}
          </div>
        </div>

        <div className="flex items-baseline gap-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">PPR</div>
            <div className="text-2xl font-semibold tabular-nums leading-tight">
              {formatRatio(ppr)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">DPR</div>
            <div className={cn('text-lg font-medium tabular-nums leading-tight', dprColor)}>
              {dprLabel}
            </div>
          </div>
        </div>

        {totalBags > 0 ? (
          <div className="space-y-1.5">
            <div
              className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`Bag placement: Hole ${formatPercent(holePct)}, Board ${formatPercent(
                boardPct
              )}, Off ${formatPercent(offPct)}`}
            >
              <div className="bg-emerald-500" style={{ width: `${holePct ?? 0}%` }} />
              <div className="bg-amber-500" style={{ width: `${boardPct ?? 0}%` }} />
              <div className="bg-muted-foreground/40" style={{ width: `${offPct ?? 0}%` }} />
            </div>
            <div className="grid grid-cols-3 text-xs tabular-nums">
              <div>
                <span className="text-muted-foreground">Hole </span>
                <span className="font-medium">{formatPercent(holePct)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Board </span>
                <span className="font-medium">{formatPercent(boardPct)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Off </span>
                <span className="font-medium">{formatPercent(offPct)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Bag placement not tracked</div>
        )}

        <div className="flex justify-between text-xs text-muted-foreground tabular-nums pt-1 border-t border-border/50">
          <span>
            <span className="uppercase tracking-wide">4B </span>
            <span className="font-medium text-foreground">{row.four_baggers ?? 0}</span>
          </span>
          <span>
            <span className="uppercase tracking-wide">Games </span>
            <span className="font-medium text-foreground">
              {row.game_wins ?? 0}–{row.game_losses ?? 0}
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

interface TeamPlayerStatsSectionProps {
  teamId: string | undefined;
}

/**
 * Player PPR/DPR from live-scored matches this season. Hidden entirely when
 * live scoring has no data yet, so the team page looks unchanged until the
 * feature is in use.
 */
const TeamPlayerStatsSection: React.FC<TeamPlayerStatsSectionProps> = ({ teamId }) => {
  const { stats, isLoading, isNotEnabled, error } = useTeamPlayerSeasonStats(teamId);

  if (isNotEnabled || error || (!isLoading && stats.length === 0)) return null;

  return (
    <CollapsibleSection
      title="Player Stats"
      icon={Target}
      iconColor="text-emerald-500"
      defaultOpen={false}
    >
      {isLoading ? (
        <LoadingState variant="inline" size="sm" message="Loading player stats…" />
      ) : (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.map((row, index) => (
              <PlayerStatCard key={row.player_id ?? row.display_name ?? `row-${index}`} row={row} />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            From live-scored matches this season. PPR = points per round thrown; DPR = point
            differential per round. Hole, Board and Off percentages count only rounds where bag
            placement was tracked.
          </p>
        </div>
      )}
    </CollapsibleSection>
  );
};

export default TeamPlayerStatsSection;
