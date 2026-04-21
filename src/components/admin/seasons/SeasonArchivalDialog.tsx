import { AlertTriangle, Trophy } from 'lucide-react';
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
import { toast } from '@/hooks/useToast';
import { Season } from '@/types/season';

interface SeasonArchivalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  season: Season;
}

const PartialArchivalWarning: React.FC = () => (
  <>
    <strong>This will perform a partial archival:</strong>
    <ul className="list-disc ml-4 mt-1 text-xs space-y-0.5">
      <li>Archive completed regular-season matches to history</li>
      <li>Reset team win/loss counters for the next season</li>
      <li>Keep the playoff bracket editable</li>
      <li>Mark the season &quot;Playoffs In Progress&quot;</li>
    </ul>
    Finalize playoffs later from Season Management to record champions.
  </>
);

const FullArchivalWarning: React.FC = () => (
  <>
    <strong>Warning:</strong> This will perform a full archival:
    <ul className="list-disc ml-4 mt-1 text-xs space-y-0.5">
      <li>Snapshot all team stats &amp; power scores</li>
      <li>Auto-detect division playoff champions from bracket data</li>
      <li>Archive all completed matches to history</li>
      <li>Deactivate the season permanently</li>
    </ul>
    A new season must be activated to continue league activities.
  </>
);

const SeasonArchivalDialog: React.FC<SeasonArchivalDialogProps> = ({ isOpen, onClose, season }) => {
  const { archiveSeason, partialArchiveSeason } = useSeasonMutations();
  const [isArchiving, setIsArchiving] = useState(false);
  const [keepPlayoffsActive, setKeepPlayoffsActive] = useState(false);

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      if (keepPlayoffsActive) {
        await partialArchiveSeason.mutateAsync({ id: season.id });
        toast({
          title: 'Success',
          description: `${season.name} archived; playoffs remain in progress. Finalize when the bracket is complete.`,
        });
      } else {
        await archiveSeason.mutateAsync({ id: season.id });
        toast({
          title: 'Success',
          description: `${season.name} has been archived`,
        });
      }
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to archive season';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Archive Season: {season?.name}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Archive this season and designate final standings. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-start gap-2 rounded-md border p-3">
          <Checkbox
            id="keep-playoffs-active"
            checked={keepPlayoffsActive}
            onCheckedChange={(checked) => setKeepPlayoffsActive(checked === true)}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label htmlFor="keep-playoffs-active" className="font-medium cursor-pointer">
              Keep playoffs active
            </Label>
            <p className="text-xs text-muted-foreground">
              Archives regular-season matches and resets team stat counters, but leaves the playoff
              bracket editable. Finalize playoffs later from Season Management to record champions
              and close out the season.
            </p>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {keepPlayoffsActive ? <PartialArchivalWarning /> : <FullArchivalWarning />}
          </AlertDescription>
        </Alert>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={isArchiving}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isArchiving
              ? 'Archiving...'
              : keepPlayoffsActive
                ? 'Archive & Keep Playoffs'
                : 'Archive Season'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SeasonArchivalDialog;
