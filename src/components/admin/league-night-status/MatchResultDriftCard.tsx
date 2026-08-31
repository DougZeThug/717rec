import { AlertTriangle, CheckCircle2, Unlink } from 'lucide-react';
import React from 'react';

import { TransitionLink } from '@/components/transitions/TransitionLink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMatchResultDrift } from '@/hooks/admin/useMatchResultDrift';

const MAX_LISTED = 10;

const formatMatchDate = (iso: string | null): string => {
  if (!iso) return 'no date';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'no date';
  return parsed.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'medium',
  });
};

const MatchResultDriftCard: React.FC = () => {
  const { matches: rows, isLoading, isError, refetch, hasActiveSeason } = useMatchResultDrift();

  const count = rows.length;
  // Never claim "all clear" without having checked: with no active season there
  // is nothing to scope the search to, so say that instead.
  const showResult = !isLoading && !isError && hasActiveSeason;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Unlink className="size-4" aria-hidden="true" />
          Matches that disagree with their rounds
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <p className="text-sm text-muted-foreground" aria-busy="true">
            Checking…
          </p>
        )}

        {isError && !isLoading && (
          <div className="space-y-2">
            <p className="text-sm text-red-500">Couldn’t check for disagreeing matches.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && !hasActiveSeason && (
          <p className="text-sm text-muted-foreground">
            No active season — nothing to check. This card only looks at the active season, because
            re-saving an archived season’s result would add it to the current standings.
          </p>
        )}

        {showResult &&
          (count === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-500">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              All clear — every live-scored match agrees with its own rounds.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-amber-500">
                <AlertTriangle className="size-4" aria-hidden="true" />
                {count} match{count === 1 ? '' : 'es'} no longer {count === 1 ? 'agrees' : 'agree'}{' '}
                with the rounds underneath {count === 1 ? 'it' : 'them'}.
              </div>
              <p className="text-xs text-muted-foreground">
                A correction changed the rounds and the result above them was never re-decided. Open
                a match, check the rounds, then press “Reopen &amp; re-save result” in Live
                Corrections.
              </p>
              <ul className="max-h-40 space-y-1 overflow-auto rounded-md border border-border bg-muted/30 p-2 text-xs">
                {rows.slice(0, MAX_LISTED).map((m) => (
                  <li key={m.id}>
                    <TransitionLink
                      to={`/matches/${m.id}/live`}
                      className="rounded-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Open ${m.team1Name} versus ${m.team2Name}`}
                    >
                      <span className="font-medium">
                        {m.team1Name} v {m.team2Name}
                      </span>{' '}
                      <span className="text-muted-foreground">· {formatMatchDate(m.date)}</span>
                    </TransitionLink>
                    <div className="text-muted-foreground">
                      {m.recorded}, but {m.derived}.
                    </div>
                  </li>
                ))}
                {rows.length > MAX_LISTED && (
                  <li className="text-muted-foreground">…and {rows.length - MAX_LISTED} more</li>
                )}
              </ul>
            </>
          ))}
      </CardContent>
    </Card>
  );
};

export default MatchResultDriftCard;
