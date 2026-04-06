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
  const { activateSeason } = useSeasonMutations();
  const [isActivating, setIsActivating] = useState(false);

  const activeSeason = seasons?.find((s) => s.is_active);
  const hasActiveSeason = !!activeSeason;

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      await activateSeason.mutateAsync(season.id);
      toast({
        title: 'Success',
        description: `${season.name} is now the active season`,
      });
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
            This will make "{season?.name}" the active season for the league.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasActiveSeason && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> The current active season "{activeSeason?.name}" will be
              automatically deactivated. All new matches and activities will be associated with "
              {season?.name}".
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>When you activate this season:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>It becomes the primary season for all league activities</li>
            <li>New matches will be associated with this season</li>
            <li>Team stats will be tracked for this season</li>
            {hasActiveSeason && <li>The current active season will be deactivated</li>}
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
