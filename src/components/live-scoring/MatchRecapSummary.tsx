import { Star, Target, Trophy, Users } from 'lucide-react';
import React from 'react';

import type { MatchRecap, RecapPlayer } from '@/utils/liveScoring/matchRecap';
import { formatPercent, formatRatio } from '@/utils/liveScoring/pprCalc';

interface MatchRecapSummaryProps {
  recap: MatchRecap;
}

const bagPercents = (p: RecapPlayer): string | null => {
  if (p.totalBags === 0) return null;
  return `${formatPercent(p.holePct)} in · ${formatPercent(p.boardPct)} on`;
};

export const MatchRecapSummary: React.FC<MatchRecapSummaryProps> = ({ recap }) => {
  const { topPerformer, mostConsistent, keyGame, teams } = recap;

  const hasAny =
    topPerformer !== null ||
    mostConsistent !== null ||
    keyGame !== null ||
    teams.some((t) => t.bagTotals.total > 0 || t.players.length > 0);

  if (!hasAny) return null;

  return (
    <div className="space-y-3" aria-label="Match recap">
      {topPerformer && (
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Star className="size-3.5 text-primary" aria-hidden />
            Top Performer
          </div>
          <p className="mt-1 text-sm">
            <span className="font-semibold">{topPerformer.name}</span>
            <span className="text-muted-foreground">
              {' '}
              — {formatRatio(topPerformer.ppr)} PPR
              {topPerformer.holePct !== null
                ? `, ${formatPercent(topPerformer.holePct)} hole rate`
                : ''}
            </span>
          </p>
        </div>
      )}

      {mostConsistent && (
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Target className="size-3.5 text-primary" aria-hidden />
            Most Consistent
          </div>
          <p className="mt-1 text-sm">
            <span className="font-semibold">{mostConsistent.name}</span>
            <span className="text-muted-foreground">
              {' '}
              — {formatPercent(mostConsistent.offPct)} off-board rate
            </span>
          </p>
        </div>
      )}

      {keyGame && (
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Trophy className="size-3.5 text-primary" aria-hidden />
            Key Game
          </div>
          <p className="mt-1 text-sm tabular-nums">
            <span className="font-semibold">Game {keyGame.gameNumber}</span>
            <span className="text-muted-foreground">
              {', '}
              {keyGame.winnerName ? `${keyGame.winnerName} won ` : 'tied '}
              {keyGame.team1Score}–{keyGame.team2Score}
            </span>
          </p>
        </div>
      )}

      {teams.some((t) => t.bagTotals.total > 0 || t.players.length > 0) && (
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="size-3.5 text-primary" aria-hidden />
            Round Stats
          </div>
          <div className="mt-2 space-y-3">
            {teams.map((team) => (
              <div key={team.side} className="space-y-1">
                <p className="text-sm font-semibold">
                  {team.name}
                  {team.bagTotals.total > 0 ? (
                    <span className="ml-1 font-normal text-muted-foreground tabular-nums">
                      : {team.bagTotals.in} in, {team.bagTotals.on} on, {team.bagTotals.off} off
                    </span>
                  ) : (
                    <span className="ml-1 font-normal text-muted-foreground">
                      : bag stats not tracked
                    </span>
                  )}
                </p>
                {team.players.length > 0 && (
                  <ul className="space-y-0.5 pl-3 text-xs text-muted-foreground">
                    {team.players.map((p) => {
                      const bags = bagPercents(p);
                      return (
                        <li key={p.playerId} className="tabular-nums">
                          <span className="text-foreground">{p.name}</span> — {formatRatio(p.ppr)}{' '}
                          PPR
                          {bags ? ` · ${bags}` : ''}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
