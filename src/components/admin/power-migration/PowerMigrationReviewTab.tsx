import { AlertTriangle, CheckCircle2, Info, RotateCcw, RotateCw, Scale } from 'lucide-react';
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
import { LoadingState } from '@/components/ui/loading-state';
import {
  usePowerMigrationComparison,
  usePowerMigrationStatus,
  useReapplyPowerMigration,
  useRevertPowerMigration,
} from '@/hooks/admin/usePowerMigrationReview';
import { toast } from '@/hooks/useToast';
import { PowerMigrationStatus } from '@/services/admin/PowerMigrationService';

import ComparisonTable from './ComparisonTable';

/** The revert/re-apply direction being confirmed, or null when no dialog is open. */
type FlipAction = 'revert' | 'reapply' | null;

/** Render a backup timestamp as a local date, tolerating a missing value. */
const formatDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString() : 'unknown date';

/** Compact error state with a retry button, shared by the two queries. */
const RetryCard: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <Card>
    <CardContent className="pt-6 space-y-2">
      <p className="text-sm text-red-500">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </CardContent>
  </Card>
);

/** Friendly card for the two "nothing to review yet" states — never an error. */
const NotAppliedCard: React.FC<{ controlsMissing: boolean }> = ({ controlsMissing }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-base">
        <Info className="size-4" aria-hidden="true" />
        The power score update isn&apos;t on the live site yet
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 text-sm text-muted-foreground">
      <p>
        The new unified power score formula has been merged on GitHub, but the database changes
        {controlsMissing ? ' (including this review tool itself)' : ''} have not been applied to the
        live database. Nothing has changed for players, and there is nothing to review or undo yet.
      </p>
      <p>
        To apply it, run the Lovable prompt from the pull request that added this tab (also in{' '}
        <span className="font-mono">docs/OPERATIONS.md</span>, section 6a). Once Lovable applies the
        migrations, this tab will show the before/after comparison automatically.
      </p>
    </CardContent>
  </Card>
);

/** Where the live database stands: applied, reverted, or a mixed state. */
const StatusBanner: React.FC<{ status: PowerMigrationStatus }> = ({ status }) => {
  if (status.status === 'partial') {
    return (
      <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
        <p>
          The database is in a mixed state: one part of the update is applied and another is not.
          This shouldn&apos;t happen — use Re-apply (or Revert) below to bring everything back in
          sync, and mention it to your developer.
        </p>
      </div>
    );
  }
  const applied = status.status === 'applied';
  return (
    <div
      className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
        applied ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-blue-500/40 bg-blue-500/10'
      }`}
    >
      <CheckCircle2
        className={`size-4 shrink-0 mt-0.5 ${applied ? 'text-emerald-500' : 'text-blue-500'}`}
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="font-medium">
          {applied
            ? 'The new unified formula is live.'
            : 'The old formula is currently active (update reverted).'}
        </p>
        {status.backedUpAt !== null ? (
          <p className="text-muted-foreground">
            Old numbers were backed up on {formatDate(status.backedUpAt)} —{' '}
            {status.backupSeasonRows} season row{status.backupSeasonRows === 1 ? '' : 's'} and{' '}
            {status.backupTeamRows} team row{status.backupTeamRows === 1 ? '' : 's'} saved (
            {status.liveSeasonRows} season rows live today).
          </p>
        ) : (
          <p className="text-muted-foreground">
            The pre-migration backup is no longer on the database (its tables have been dropped), so
            the comparison and the Revert option are no longer available.
          </p>
        )}
      </div>
    </div>
  );
};

/** Shown while reverted: the live numbers ARE the old formula, so no table. */
const RevertedNote: React.FC = () => (
  <Card>
    <CardContent className="pt-6 text-sm text-muted-foreground">
      The site is back on the old formula, so the live numbers are the &quot;before&quot; side and
      there is nothing new to compare against. The before/after comparison is shown while the new
      formula is applied — use Re-apply to switch back and review it again.
    </CardContent>
  </Card>
);

interface ComparisonSectionProps {
  backedUpAt: string | null;
  comparisonQuery: ReturnType<typeof usePowerMigrationComparison>;
}

/** Heading, caveat copy, and the before/after Career Standings table. */
const ComparisonSection: React.FC<ComparisonSectionProps> = ({ backedUpAt, comparisonQuery }) => (
  <div className="space-y-2">
    <div>
      <h3 className="text-base font-semibold">Career Standings: before vs. after</h3>
      <p className="text-sm text-muted-foreground">
        &quot;Before&quot; shows Career Standings the way the site computed them when the backup was
        taken on {formatDate(backedUpAt)}. Games played since then still count toward the records on
        both sides, but the &quot;before&quot; power scores stay frozen at the backup.
      </p>
    </div>

    {comparisonQuery.isLoading && (
      <LoadingState variant="section" message="Building comparison..." />
    )}
    {comparisonQuery.isError && !comparisonQuery.isLoading && (
      <RetryCard
        message="Couldn't build the comparison."
        onRetry={() => comparisonQuery.refetch()}
      />
    )}
    {comparisonQuery.data && <ComparisonTable rows={comparisonQuery.data.rows} />}
  </div>
);

/** Plain-language consequence copy for the pending revert/re-apply action. */
const FlipDialogBody: React.FC<{ action: FlipAction }> = ({ action }) => (
  <>
    <span className="block">
      {action === 'revert'
        ? 'This restores the old formula and recalculates every season — including ' +
          'games played since the update, so nothing is lost. Career Standings, ' +
          'History and team pages go back to their old ordering.'
        : 'This switches every season back to the new unified formula (playoff games ' +
          'count, byes do not) and recalculates all stats. Career Standings will ' +
          're-order as shown in the comparison below.'}
    </span>
    <span className="block">
      Heads up: the homepage &quot;Movers&quot; section compares against last week&apos;s snapshot,
      so it may look off for up to a week after switching. It corrects itself at the next weekly
      snapshot.
    </span>
  </>
);

interface ConfirmFlipDialogProps {
  action: FlipAction;
  isFlipping: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirmation gate in front of the revert/re-apply mutations. */
const ConfirmFlipDialog: React.FC<ConfirmFlipDialogProps> = ({
  action,
  isFlipping,
  onClose,
  onConfirm,
}) => {
  const label = action === 'revert' ? 'Revert' : 'Re-apply';
  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {action === 'revert'
              ? 'Go back to the old power scores?'
              : 'Apply the new unified power scores?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <FlipDialogBody action={action} />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isFlipping}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isFlipping}
          >
            {isFlipping ? 'Processing…' : label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

interface FlipActionsProps {
  status: PowerMigrationStatus;
  backupAvailable: boolean;
  isBusy: boolean;
  revertPending: boolean;
  reapplyPending: boolean;
  onAction: (action: 'revert' | 'reapply') => void;
}

/** The Revert / Re-apply buttons appropriate to the current state. */
const FlipActions: React.FC<FlipActionsProps> = ({
  status,
  backupAvailable,
  isBusy,
  revertPending,
  reapplyPending,
  onAction,
}) => (
  <div className="flex flex-wrap gap-2">
    {status.status !== 'reverted' && backupAvailable && (
      <Button variant="outline" size="sm" disabled={isBusy} onClick={() => onAction('revert')}>
        <RotateCcw className="size-4 mr-2" aria-hidden="true" />
        {revertPending ? 'Reverting…' : 'Revert to old scores'}
      </Button>
    )}
    {status.status !== 'applied' && (
      <Button size="sm" disabled={isBusy} onClick={() => onAction('reapply')}>
        <RotateCw className="size-4 mr-2" aria-hidden="true" />
        {reapplyPending ? 'Re-applying…' : 'Re-apply new scores'}
      </Button>
    )}
  </div>
);

/**
 * Admin review of the power-score unification: shows where the live database
 * stands, a before/after Career Standings comparison built from the
 * pre-migration backup, and confirmed one-click Revert / Re-apply.
 */
const PowerMigrationReviewTab: React.FC = () => {
  const statusQuery = usePowerMigrationStatus();
  const status = statusQuery.data;
  const backupAvailable = status?.backedUpAt != null;
  const comparisonQuery = usePowerMigrationComparison(status);
  const revert = useRevertPowerMigration();
  const reapply = useReapplyPowerMigration();
  const [confirmAction, setConfirmAction] = useState<FlipAction>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  const isBusy = revert.isPending || reapply.isPending || isFlipping;
  const notApplied =
    status !== undefined &&
    (status.status === 'controls_missing' || status.status === 'not_applied');
  const reviewable = status !== undefined && !notApplied;

  const runConfirmedAction = async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (!action) return;
    try {
      const result = action === 'revert' ? await revert.mutateAsync() : await reapply.mutateAsync();
      const wasNoOp = result === 'already_reverted' || result === 'already_applied';
      toast({
        title: wasNoOp
          ? 'Nothing to do'
          : action === 'revert'
            ? 'Old formula restored'
            : 'New formula applied',
        description: wasNoOp
          ? 'The database was already in that state.'
          : 'All season stats have been recalculated. Pages may take a moment to refresh.',
      });
    } catch (err) {
      toast({
        title: action === 'revert' ? 'Revert failed' : 'Re-apply failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <AdminSectionWrapper title="Power Score Migration Review" icon={Scale}>
      <div className="space-y-4">
        {statusQuery.isLoading && (
          <LoadingState variant="section" message="Checking migration status..." />
        )}

        {statusQuery.isError && !statusQuery.isLoading && (
          <RetryCard
            message="Couldn't check the migration status."
            onRetry={() => statusQuery.refetch()}
          />
        )}

        {notApplied && <NotAppliedCard controlsMissing={status?.status === 'controls_missing'} />}

        {reviewable && status && (
          <>
            <StatusBanner status={status} />
            <FlipActions
              status={status}
              backupAvailable={backupAvailable}
              isBusy={isBusy}
              revertPending={revert.isPending}
              reapplyPending={reapply.isPending}
              onAction={setConfirmAction}
            />
            {status.status === 'reverted' && <RevertedNote />}
            {status.status !== 'reverted' && backupAvailable && (
              <ComparisonSection backedUpAt={status.backedUpAt} comparisonQuery={comparisonQuery} />
            )}
          </>
        )}

        <ConfirmFlipDialog
          action={confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={runConfirmedAction}
        />
      </div>
    </AdminSectionWrapper>
  );
};

export default PowerMigrationReviewTab;
