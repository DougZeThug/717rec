import { CheckCircle2, Info, RotateCcw, Save, SlidersHorizontal } from 'lucide-react';
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
  baselineWeights,
  useApplyPowerWeights,
  usePowerWeightPreview,
  usePowerWeightState,
  useRevertPowerWeights,
} from '@/hooks/admin/usePowerWeightSandbox';
import { toast } from '@/hooks/useToast';
import { PowerWeightState, toPowerScoreWeights } from '@/services/admin/PowerWeightSandboxService';
import { isValidWeights, PowerScoreWeights, weightsEqual } from '@/utils/powerScore/weights';

import { formatTriple } from './previewFormat';
import SandboxPreviewTabs from './SandboxPreviewTabs';
import WeightControls from './WeightControls';

/** The pending confirmation, or null when no dialog is open. */
type SandboxAction = 'save' | 'revert' | null;

const formatDate = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString() : 'unknown date';

/** Friendly card for the pre-migration state — never an error. */
const NotAppliedCard: React.FC = () => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-base">
        <Info className="size-4" aria-hidden="true" />
        The weight controls aren&apos;t on the live database yet
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 text-sm text-muted-foreground">
      <p>
        This sandbox is merged on GitHub, but its database changes have not been applied to the live
        database. You can still experiment below — the preview compares against the standard
        40/45/15 weights — but Save stays off until the database is updated. Nothing has changed for
        players.
      </p>
      <p>
        To unlock Save, run the migration from <span className="font-mono">docs/OPERATIONS.md</span>
        , section 6b (a copy-paste into the Supabase SQL editor). This banner disappears once it has
        run.
      </p>
    </CardContent>
  </Card>
);

/** The live triple, when it was applied, and what a revert would restore. */
const WeightsBanner: React.FC<{ state: PowerWeightState }> = ({ state }) => {
  if (!state.current) return null;
  const current = toPowerScoreWeights(state.current);
  return (
    <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
      <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-500" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium">
          Live weights: {formatTriple(current)} (match wins / schedule / game wins).
        </p>
        <p className="text-muted-foreground">
          Applied {formatDate(state.current.applied_at)}
          {state.current.note ? ` — “${state.current.note}”` : ''}.{' '}
          {state.previous
            ? `Revert would go back to ${formatTriple(toPowerScoreWeights(state.previous))}.`
            : 'There are no earlier weights to revert to.'}
        </p>
      </div>
    </div>
  );
};

/** What saving actually does — shown above the previews, not buried in the dialog. */
const ConsequencesNote: React.FC = () => (
  <div className="flex items-start gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
    <Info className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
    <p>
      The preview below is safe — nothing changes until you press Save. Saving rescores every season{' '}
      <span className="font-medium text-foreground">including archived ones</span>, so Standings,
      Career and History all move at once. The homepage &quot;Movers&quot; section compares against
      last week&apos;s snapshot, so it can look off for up to a week after a change; it corrects
      itself at the next weekly snapshot.
    </p>
  </div>
);

interface ConfirmDialogProps {
  action: SandboxAction;
  baseline: PowerScoreWeights;
  candidate: PowerScoreWeights;
  previous: PowerScoreWeights | null;
  seasonRowsHint: string;
  isMutating: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirmation gate in front of the save/revert mutations. */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  action,
  baseline,
  candidate,
  previous,
  seasonRowsHint,
  isMutating,
  onClose,
  onConfirm,
}) => {
  const label = action === 'revert' ? 'Revert' : 'Save';
  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {action === 'revert'
              ? `Go back to the ${previous ? formatTriple(previous) : 'previous'} weights?`
              : `Change the weights from ${formatTriple(baseline)} to ${formatTriple(candidate)}?`}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              This rescores {seasonRowsHint}, archived seasons included, so Standings, Career and
              History change for real. It is fully reversible — the previous weights stay one Revert
              away.
            </span>
            <span className="block">
              Heads up: the homepage &quot;Movers&quot; section may look off for up to a week
              afterwards. It corrects itself at the next weekly snapshot.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isMutating}
          >
            {isMutating ? 'Rescoring…' : label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/**
 * Admin sandbox for the power score weights: adjust the three weights, watch
 * the current-season and career standings re-rank live (client-side, nothing
 * written), then Save to apply for real or Revert to the previous triple.
 */
const PowerScoreSandboxTab: React.FC = () => {
  const stateQuery = usePowerWeightState();
  const state = stateQuery.data;
  const controlsApplied = state?.controlsApplied === true;
  const baseline = baselineWeights(state);

  const [draft, setDraft] = useState<PowerScoreWeights | null>(null);
  const candidate = draft ?? baseline;
  const previewQuery = usePowerWeightPreview(candidate, state);

  const apply = useApplyPowerWeights();
  const revert = useRevertPowerWeights();
  const [confirmAction, setConfirmAction] = useState<SandboxAction>(null);
  const [isMutating, setIsMutating] = useState(false);

  const unchanged = weightsEqual(candidate, baseline);
  const canSave = controlsApplied && isValidWeights(candidate) && !unchanged && !isMutating;
  const previous = state?.previous ? toPowerScoreWeights(state.previous) : null;
  const seasonRowsHint = previewQuery.data
    ? `all ${previewQuery.data.career.length} teams across every stored season`
    : 'every stored season';

  const runConfirmedAction = async () => {
    const action = confirmAction;
    if (!action) return;

    setIsMutating(true);
    try {
      if (action === 'save') {
        const result = await apply.mutateAsync({ weights: candidate });
        setConfirmAction(null); // close only after success
        setDraft(null); // the candidate is the new baseline
        toast({
          title:
            result.status === 'reasserted' ? 'Weights were already live' : 'New weights are live',
          description:
            result.status === 'reasserted'
              ? 'The database already used these weights; every season was re-checked.'
              : `${formatTriple(candidate)} now scores all ${result.seasonRows} stored season rows, archived seasons included.`,
        });
      } else {
        const result = await revert.mutateAsync();
        setConfirmAction(null);
        setDraft(null);
        toast({
          title:
            result.status === 'nothing_to_revert'
              ? 'Nothing to revert'
              : 'Previous weights restored',
          description:
            result.status === 'nothing_to_revert'
              ? 'There are no earlier weights on record.'
              : 'All season stats have been rescored under the previous weights.',
        });
      }
    } catch (err) {
      toast({
        title: action === 'save' ? 'Save failed' : 'Revert failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      // keep dialog open on error so the failure is seen in context
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <AdminSectionWrapper title="Power Score Sandbox" icon={SlidersHorizontal}>
      <div className="space-y-4">
        {stateQuery.isLoading && (
          <LoadingState variant="section" message="Checking the live weights..." />
        )}

        {stateQuery.isError && !stateQuery.isLoading && (
          <Card>
            <CardContent className="pt-6 space-y-2">
              <p className="text-sm text-red-500">Couldn&apos;t check the live weights.</p>
              <Button size="sm" variant="outline" onClick={() => stateQuery.refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {state !== undefined && (
          <>
            {controlsApplied ? <WeightsBanner state={state} /> : <NotAppliedCard />}

            <WeightControls
              value={candidate}
              baseline={baseline}
              disabled={isMutating}
              onChange={setDraft}
            />

            <ConsequencesNote />

            <SandboxPreviewTabs
              baseline={baseline}
              candidate={candidate}
              previewQuery={previewQuery}
            />

            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={!canSave} onClick={() => setConfirmAction('save')}>
                <Save className="size-4 mr-2" aria-hidden="true" />
                {isMutating ? 'Rescoring…' : 'Save & rescore'}
              </Button>
              {controlsApplied && previous && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isMutating}
                  onClick={() => setConfirmAction('revert')}
                >
                  <RotateCcw className="size-4 mr-2" aria-hidden="true" />
                  Revert to {formatTriple(previous)}
                </Button>
              )}
            </div>
          </>
        )}

        <ConfirmDialog
          action={confirmAction}
          baseline={baseline}
          candidate={candidate}
          previous={previous}
          seasonRowsHint={seasonRowsHint}
          isMutating={isMutating}
          onClose={() => setConfirmAction(null)}
          onConfirm={runConfirmedAction}
        />
      </div>
    </AdminSectionWrapper>
  );
};

export default PowerScoreSandboxTab;
