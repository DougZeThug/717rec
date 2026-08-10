import { AlertTriangle, History, Info, RotateCcw, RotateCw } from 'lucide-react';
import React, { useState } from 'react';

import AdminSectionWrapper from '@/components/admin/AdminSectionWrapper';
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
import {
  usePowerMigrationComparison,
  usePowerMigrationStatus,
  useReapplyPowerMigration,
  useRevertPowerMigration,
} from '@/hooks/admin/usePowerMigrationReview';
import { toast } from '@/hooks/useToast';

import ComparisonTable from './ComparisonTable';

const formatBackupDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'unknown date';

const PowerMigrationReviewTab: React.FC = () => {
  const statusQuery = usePowerMigrationStatus();
  const status = statusQuery.data;
  const canCompare =
    status?.state === 'applied' || status?.state === 'reverted' || status?.state === 'partial';
  const comparisonQuery = usePowerMigrationComparison(canCompare);
  const revert = useRevertPowerMigration();
  const reapply = useReapplyPowerMigration();
  const [confirmAction, setConfirmAction] = useState<'revert' | 'reapply' | null>(null);

  const isMutating = revert.isPending || reapply.isPending;

  const handleConfirm = async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (!action) return;
    try {
      if (action === 'revert') {
        await revert.mutateAsync();
        toast({
          title: 'Migration reverted',
          description:
            'All ratings and records were recalculated with the old formula. The Stats page now shows the old numbers.',
        });
      } else {
        await reapply.mutateAsync();
        toast({
          title: 'Migration re-applied',
          description:
            'All ratings and records were recalculated with the new unified formula. The Stats page now shows the new numbers.',
        });
      }
    } catch (err) {
      toast({
        title: action === 'revert' ? 'Revert failed' : 'Re-apply failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <AdminSectionWrapper title="Power Score Migration Review" icon={History}>
      <div className="space-y-4">
        {statusQuery.isLoading && (
          <p className="text-sm text-muted-foreground" aria-busy="true">
            Checking migration status…
          </p>
        )}

        {statusQuery.isError && !statusQuery.isLoading && (
          <Card>
            <CardContent className="space-y-2 pt-6">
              <p className="text-sm text-red-500">Couldn't check the migration status.</p>
              <Button size="sm" variant="outline" onClick={() => statusQuery.refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {status && (status.state === 'controls_missing' || status.state === 'not_applied') && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="size-4" aria-hidden="true" />
                Migration not applied yet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                The power-score database update hasn't been applied to the live site yet, so there
                is nothing to review here.
              </p>
              <p>
                To apply it, ask Lovable to run the pending migration files (see "Applying database
                migrations to production" in docs/OPERATIONS.md). Once applied, this page shows how
                the Career Standings changed and lets you revert.
              </p>
            </CardContent>
          </Card>
        )}

        {status && (status.state === 'applied' || status.state === 'reverted') && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4" aria-hidden="true" />
                {status.state === 'applied'
                  ? 'New formula is live'
                  : 'Old formula is live (reverted)'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                The old numbers were backed up on {formatBackupDate(status.backedUpAt)} (
                {status.backupSeasonRows} season rows, {status.backupPowerRows} team rows) and stay
                stored either way. "Before" below means the site as it looked at that moment.
              </p>
              {status.state === 'applied' ? (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isMutating}
                  onClick={() => setConfirmAction('revert')}
                >
                  <RotateCcw className="mr-2 size-4" aria-hidden="true" />
                  {revert.isPending ? 'Reverting…' : 'Revert to old formula'}
                </Button>
              ) : (
                <Button size="sm" disabled={isMutating} onClick={() => setConfirmAction('reapply')}>
                  <RotateCw className="mr-2 size-4" aria-hidden="true" />
                  {reapply.isPending ? 'Re-applying…' : 'Re-apply new formula'}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {status?.state === 'partial' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-amber-500">
                <AlertTriangle className="size-4" aria-hidden="true" />
                Partially applied
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                The database is halfway between the old and new formula (someone likely ran SQL by
                hand). Use one of the buttons to land cleanly on one side.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isMutating}
                  onClick={() => setConfirmAction('revert')}
                >
                  <RotateCcw className="mr-2 size-4" aria-hidden="true" />
                  Revert to old formula
                </Button>
                <Button size="sm" disabled={isMutating} onClick={() => setConfirmAction('reapply')}>
                  <RotateCw className="mr-2 size-4" aria-hidden="true" />
                  Re-apply new formula
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {canCompare && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Career Standings: before vs. after the migration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Both columns are computed the same way the Stats page computes Career Statistics —
                "Before" uses the backed-up data, "After" uses the live data.
              </p>
              {comparisonQuery.isLoading && (
                <p className="text-sm text-muted-foreground" aria-busy="true">
                  Computing comparison…
                </p>
              )}
              {comparisonQuery.isError && !comparisonQuery.isLoading && (
                <div className="space-y-2">
                  <p className="text-sm text-red-500">Couldn't build the comparison.</p>
                  <Button size="sm" variant="outline" onClick={() => comparisonQuery.refetch()}>
                    Retry
                  </Button>
                </div>
              )}
              {comparisonQuery.data && <ComparisonTable rows={comparisonQuery.data} />}
            </CardContent>
          </Card>
        )}

        <AlertDialog
          open={confirmAction !== null}
          onOpenChange={(open) => !open && setConfirmAction(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmAction === 'revert'
                  ? 'Revert to the old formula?'
                  : 'Re-apply the new formula?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction === 'revert'
                  ? 'Every rating and record across the site (Stats, History, rankings, report cards) is recalculated with the old formula. Games played since the migration are kept — nothing is lost. The weekly Movers numbers may look off for one week because recent snapshots were taken under the new formula. You can re-apply at any time.'
                  : 'Every rating and record across the site is recalculated with the new unified formula (playoff games count, byes do not, all pages use the same math). The weekly Movers numbers may look off for one week. You can revert again at any time.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm}>
                {confirmAction === 'revert' ? 'Revert' : 'Re-apply'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminSectionWrapper>
  );
};

export default PowerMigrationReviewTab;
