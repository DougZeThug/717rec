import { AlertTriangle } from 'lucide-react';
import React, { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useSeasonMutations } from '@/hooks/useSeasonMutations';
import { useSeasons } from '@/hooks/useSeasons';
import { toast } from '@/hooks/useToast';
import { Season } from '@/types/season';

interface SeasonActivationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  season: Season;
}

const SeasonActivationDialog: React.FC<SeasonActivationDialogProps> = ({
  isOpen,
  onClose,
  season,
}) => {
  const { data: seasons } = useSeasons();
  const { activateSeason, activateSeasonWithPartialArchive } = useSeasonMutations();
  const [isActivating, setIsActivating] = useState(false);
  const [keepOldPlayoffsActive, setKeepOldPlayoffsActive] = useState(false);

  const activeSeason = seasons?.find((s) => s.is_active);
  const hasActiveSeason = !!activeSeason;
  const showOverlapOption = hasActiveSeason && activeSeason?.id !== season.id;

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      if (showOverlapOption && keepOldPlayoffsActive) {
        await activateSeasonWithPartialArchive.mutateAsync(season.id);
        toast({
          title: 'Success',
          description: `${season.name} is active; ${activeSeason?.name}'s playoffs remain in progress.`,
        });
      } else {
        await activateSeason.mutateAsync(season.id);
        toast({
          title: 'Success',
          description: `${season.name} is now the active season`,
        });
      }
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to activate season';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Activate Season: {season?.name}</AlertDialogTitle>
          <AlertDialogDescription>
            This will make &quot;{season?.name}&quot; the active season for the league.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasActiveSeason && (
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertDescription>
              <strong>Warning:</strong> The current active season &quot;{activeSeason?.name}&quot; will be
              automatically deactivated. All new matches and activities will be associated with &quot;
              {season?.name}&quot;.
            </AlertDescription>
          </Alert>
        )}

        {showOverlapOption && (
          <div className="flex items-start gap-2 rounded-md border p-3">
            <Checkbox
              id="keep-playoffs-active"
              checked={keepOldPlayoffsActive}
              onCheckedChange={(checked) => setKeepOldPlayoffsActive(checked === true)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label htmlFor="keep-playoffs-active" className="font-medium cursor-pointer">
                Keep {activeSeason?.name}&apos;s playoffs active
              </Label>
              <p className="text-xs text-muted-foreground">
                Archives {activeSeason?.name}&apos;s regular-season matches now, but leaves the
                in-progress playoff bracket running. New regular matches will schedule on{' '}
                {season?.name}. You&apos;ll finalize the playoffs later from Season Management.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>When you activate this season:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>It becomes the primary season for all league activities</li>
            <li>New matches will be associated with this season</li>
            <li>Team stats will be tracked for this season</li>
            {hasActiveSeason && !keepOldPlayoffsActive && (
              <li>The current active season will be deactivated</li>
            )}
            {showOverlapOption && keepOldPlayoffsActive && (
              <>
                <li>{activeSeason?.name}&apos;s regular-season matches will be archived</li>
                <li>{activeSeason?.name}&apos;s playoff bracket will stay in progress</li>
                <li>Team wins/losses counters will reset for {season?.name}</li>
              </>
            )}
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleActivate}
            disabled={isActivating}
            className="bg-green-600 hover:bg-green-700"
          >
            {isActivating ? 'Activating...' : 'Activate Season'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SeasonActivationDialog;
