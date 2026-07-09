import { Target } from 'lucide-react';
import React from 'react';

import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { LoadingState } from '@/components/ui/loading-state';
import { useTeamPlayerSeasonStats } from '@/hooks/live-scoring/useTeamPlayerSeasonStats';
import {
  differentialPerRound,
  formatPercent,
  formatRatio,
  percentage,
  pointsPerRound,
} from '@/utils/liveScoring/pprCalc';

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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-1.5 pr-2 font-medium">Player</th>
                <th className="pb-1.5 px-2 text-right font-medium">Rounds</th>
                <th className="pb-1.5 px-2 text-right font-medium" title="Points per round">
                  PPR
                </th>
                <th className="pb-1.5 px-2 text-right font-medium" title="Differential per round">
                  DPR
                </th>
                <th className="pb-1.5 px-2 text-right font-medium" title="Bags in the hole">
                  Hole%
                </th>
                <th className="pb-1.5 px-2 text-right font-medium" title="Bags on the board">
                  Board%
                </th>
                <th className="pb-1.5 px-2 text-right font-medium" title="Bags off the board">
                  Off%
                </th>
                <th className="pb-1.5 px-2 text-right font-medium" title="Four-baggers">
                  4B
                </th>
                <th className="pb-1.5 pl-2 text-right font-medium">Games</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => {
                // Only bag-tracked rounds count — null bags mean "unknown".
                const totalBags = (row.bags_in ?? 0) + (row.bags_on ?? 0) + (row.bags_off ?? 0);
                return (
                  <tr key={row.player_id} className="border-t border-border/50 tabular-nums">
                    <td className="py-1.5 pr-2">{row.display_name}</td>
                    <td className="py-1.5 px-2 text-right">{row.rounds_thrown}</td>
                    <td className="py-1.5 px-2 text-right font-medium">
                      {formatRatio(pointsPerRound(row.points_for ?? 0, row.rounds_thrown ?? 0))}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      {formatRatio(
                        differentialPerRound(
                          row.points_for ?? 0,
                          row.points_against ?? 0,
                          row.rounds_thrown ?? 0
                        )
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      {formatPercent(percentage(row.bags_in ?? 0, totalBags))}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      {formatPercent(percentage(row.bags_on ?? 0, totalBags))}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      {formatPercent(percentage(row.bags_off ?? 0, totalBags))}
                    </td>
                    <td className="py-1.5 px-2 text-right">{row.four_baggers}</td>
                    <td className="py-1.5 pl-2 text-right">
                      {row.game_wins}–{row.game_losses}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            From live-scored matches this season. PPR = points per round thrown; DPR = point
            differential per round. Hole%, Board% and Off% count only rounds where bag placement was
            tracked.
          </p>
        </div>
      )}
    </CollapsibleSection>
  );
};

export default TeamPlayerStatsSection;
