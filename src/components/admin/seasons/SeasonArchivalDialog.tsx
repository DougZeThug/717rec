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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamsArray } from '@/hooks/teams';
import { toast } from '@/hooks/useToast';
import { useSeasonMutations } from '@/hooks/useSeasonMutations';

interface SeasonArchivalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  season: any;
}

const SeasonArchivalDialog: React.FC<SeasonArchivalDialogProps> = ({ isOpen, onClose, season }) => {
  const { teams } = useTeamsArray();
  const { archiveSeason } = useSeasonMutations();
  const [isArchiving, setIsArchiving] = useState(false);
  const [championId, setChampionId] = useState<string>('');
  const [runnerUpId, setRunnerUpId] = useState<string>('');
  const [thirdPlaceId, setThirdPlaceId] = useState<string>('');

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      await archiveSeason.mutateAsync({
        id: season.id,
        champion_team_id: championId || null,
        runner_up_team_id: runnerUpId || null,
        third_place_team_id: thirdPlaceId || null,
      });
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

  const availableTeams =
    teams?.filter(
      (team) => team.id !== championId && team.id !== runnerUpId && team.id !== thirdPlaceId
    ) || [];

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
            <strong>Warning:</strong> Archiving will deactivate this season and preserve all stats.
            A new season must be activated to continue league activities.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="champion">Champion (Optional)</Label>
            <Select value={championId} onValueChange={setChampionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select champion team" />
              </SelectTrigger>
              <SelectContent>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="runner-up">Runner-up (Optional)</Label>
            <Select value={runnerUpId} onValueChange={setRunnerUpId}>
              <SelectTrigger>
                <SelectValue placeholder="Select runner-up team" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="third-place">Third Place (Optional)</Label>
            <Select value={thirdPlaceId} onValueChange={setThirdPlaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select third place team" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

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
