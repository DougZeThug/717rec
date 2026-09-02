import { Archive } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSeasonMutations } from '@/hooks/useSeasonMutations';
import { toast } from '@/hooks/useToast';
import { Season } from '@/types/season';
import { getUIErrorMessage } from '@/utils/errorHandler';

import SeasonArchivalDialog from './SeasonArchivalDialog';

interface SeasonActionsProps {
  season: Season;
}

const SeasonActions: React.FC<SeasonActionsProps> = ({ season }) => {
  const [showArchivalDialog, setShowArchivalDialog] = useState(false);
  const { setSeasonConfirmationOpen } = useSeasonMutations();

  const confirmationOpen = season.confirmation_open ?? false;

  const handleConfirmationToggle = (open: boolean) => {
    setSeasonConfirmationOpen.mutate(
      { id: season.id, open },
      {
        onSuccess: () => {
          toast({
            title: open ? 'Confirmation opened' : 'Confirmation closed',
            description: open
              ? `Teams can now confirm they are playing in ${season.name}.`
              : `The "Confirm your team" card is hidden for ${season.name}.`,
          });
        },
        onError: (error) => {
          toast({
            title: 'Failed to change confirmation',
            description: getUIErrorMessage(error),
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="default" className="bg-green-500">
        Current Active Season
      </Badge>

      {/* Nothing in the app could write confirmation_open, so the card it gates
          on the home page could never be shown. */}
      <div className="flex items-center gap-2">
        <Switch
          id="season-confirmation-open"
          checked={confirmationOpen}
          disabled={setSeasonConfirmationOpen.isPending}
          onCheckedChange={handleConfirmationToggle}
        />
        <label htmlFor="season-confirmation-open" className="text-sm font-medium">
          Open for confirmation
        </label>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowArchivalDialog(true)}
        className="flex items-center gap-1"
      >
        <Archive className="size-3" />
        Archive Season
      </Button>

      <SeasonArchivalDialog
        isOpen={showArchivalDialog}
        onClose={() => setShowArchivalDialog(false)}
        season={season}
      />
    </div>
  );
};

export default SeasonActions;
