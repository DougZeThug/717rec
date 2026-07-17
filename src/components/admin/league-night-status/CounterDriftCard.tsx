import { AlertTriangle, CheckCircle2, Scale } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from '@/hooks/useToast';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCounterDrift, useReconcileCounters } from '@/hooks/admin/useCounterDrift';

const CounterDriftCard: React.FC = () => {
  const driftQuery = useCounterDrift();
  const reconcile = useReconcileCounters();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const rows = driftQuery.data ?? [];
  const count = rows.length;

  const handleRepair = async () => {
    setConfirmOpen(false);
    try {
      const repaired = await reconcile.mutateAsync();
      toast({
        title: repaired === 0 ? 'Already in sync' : 'Counters repaired',
        description:
          repaired === 0
            ? 'No rows needed repair.'
            : `Repaired ${repaired} team${repaired === 1 ? '' : 's'}.`,
      });
    } catch (err) {
      toast({
        title: 'Repair failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="size-4" aria-hidden="true" />
          Standings counters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {driftQuery.isLoading && (
          <p className="text-sm text-muted-foreground" aria-busy="true">
            Checking…
          </p>
        )}

        {driftQuery.isError && !driftQuery.isLoading && (
          <div className="space-y-2">
            <p className="text-sm text-red-500">Couldn't check counter sync.</p>
            <Button size="sm" variant="outline" onClick={() => driftQuery.refetch()}>
              Retry
            </Button>
          </div>
        )}

        {!driftQuery.isLoading && !driftQuery.isError && (
          <>
            {count === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-500">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                In sync — every team's stored W-L matches match history.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-amber-500">
                  <AlertTriangle className="size-4" aria-hidden="true" />
                  {count} team{count === 1 ? '' : 's'} out of sync with match history.
                </div>
                <ul className="max-h-40 overflow-auto rounded-md border border-border bg-muted/30 p-2 text-xs">
                  {rows.slice(0, 10).map((r) => (
                    <li key={r.team_id} className="tabular-nums">
                      <span className="font-medium">{r.name}</span>: stored {r.counter_wins}-
                      {r.counter_losses} · derived {r.derived_wins}-{r.derived_losses}
                    </li>
                  ))}
                  {rows.length > 10 && (
                    <li className="text-muted-foreground">…and {rows.length - 10} more</li>
                  )}
                </ul>
              </>
            )}

            <Button
              size="sm"
              variant={count > 0 ? 'default' : 'outline'}
              disabled={reconcile.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              {reconcile.isPending ? 'Repairing…' : 'Repair now'}
            </Button>
          </>
        )}

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Repair standings counters?</AlertDialogTitle>
              <AlertDialogDescription>
                This recomputes every team's wins, losses, and game counts from completed
                matches, then refreshes the season-stats cache. Safe to run any time — it does
                nothing if counters already match.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRepair}>Repair now</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default CounterDriftCard;