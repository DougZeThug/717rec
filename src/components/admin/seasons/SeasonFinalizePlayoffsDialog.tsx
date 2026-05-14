import { Trophy } from 'lucide-react';
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
import { useSeasonMutations } from '@/hooks/useSeasonMutations';
import { toast } from '@/hooks/useToast';
import { Season } from '@/types/season';

interface SeasonFinalizePlayoffsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  season: Season;
}

const StepsList: React.FC = () => (
  <ul className="list-disc ml-4 mt-1 text-xs space-y-0.5">
    <li>Refresh team season stats with final playoff results</li>
    <li>Auto-detect champion, runner-up, and playoff ranks from the bracket</li>
    <li>Snapshot team details for the season archive</li>
    <li>Rotate season badges and award champion badges</li>
    <li>Mark the season as fully archived</li>
  </ul>
);

const DialogHeader: React.FC<{ seasonName: string }> = ({ seasonName }) => (
  <AlertDialogHeader>
    <AlertDialogTitle className="flex items-center gap-2">
      <Trophy className="size-5 text-yellow-500" />
      Finalize Playoffs: {seasonName}
    </AlertDialogTitle>
    <AlertDialogDescription>
      Finalize the playoff bracket for this season. Only run this once every playoff match has a
      winner. This action cannot be undone.
    </AlertDialogDescription>
  </AlertDialogHeader>
);

const DialogBody: React.FC = () => (
  <Alert>
    <Trophy className="size-4" />
    <AlertDescription>
      <strong>This will:</strong>
      <StepsList />
    </AlertDescription>
  </Alert>
);

const DialogActions: React.FC<{ isFinalizing: boolean; onFinalize: () => void }> = ({
  isFinalizing,
  onFinalize,
}) => (
  <AlertDialogFooter>
    <AlertDialogCancel>Cancel</AlertDialogCancel>
    <AlertDialogAction
      onClick={(e) => {
        e.preventDefault();
        onFinalize();
      }}
      disabled={isFinalizing}
      className="bg-yellow-600 hover:bg-yellow-700"
    >
      {isFinalizing ? 'Finalizing...' : 'Finalize Playoffs'}
    </AlertDialogAction>
  </AlertDialogFooter>
);

const SeasonFinalizePlayoffsDialog: React.FC<SeasonFinalizePlayoffsDialogProps> = ({
  isOpen,
  onClose,
  season,
}) => {
  const { finalizePlayoffs } = useSeasonMutations();
  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleFinalize = async () => {
    setIsFinalizing(true);
    try {
      await finalizePlayoffs.mutateAsync({
        seasonId: season.id,
        championTeamId: null,
        runnerUpTeamId: null,
        thirdPlaceTeamId: null,
      });
      toast({
        title: 'Success',
        description: `${season.name}'s playoffs have been finalized.`,
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to finalize playoffs';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <DialogHeader seasonName={season?.name} />
        <DialogBody />
        <DialogActions isFinalizing={isFinalizing} onFinalize={handleFinalize} />
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SeasonFinalizePlayoffsDialog;
