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
import { useSeasonMutations } from '@/hooks/useSeasonMutations';
import { toast } from '@/hooks/useToast';

interface SeasonArchivalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  season: any;
}

const SeasonArchivalDialog: React.FC<SeasonArchivalDialogProps> = ({ isOpen, onClose, season }) => {
  const { archiveSeason } = useSeasonMutations();
  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      await archiveSeason.mutateAsync({ id: season.id });
      toast({
        title: 'Success',
        description: `${season.name} has been archived`,
      });
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

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This will perform a full archival:
            <ul className="list-disc ml-4 mt-1 text-xs space-y-0.5">
              <li>Snapshot all team stats &amp; power scores</li>
              <li>Auto-detect division playoff champions from bracket data</li>
              <li>Archive all completed matches to history</li>
              <li>Deactivate the season permanently</li>
            </ul>
            A new season must be activated to continue league activities.
          </AlertDescription>
        </Alert>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={isArchiving}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isArchiving ? 'Archiving...' : 'Archive Season'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SeasonArchivalDialog;
