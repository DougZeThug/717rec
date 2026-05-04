import TeamForm from '@/components/teams/TeamForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Team } from '@/types';

type EditTeamDialogProps = {
  team: Team | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (teamData: Omit<Team, 'id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
};

const EditTeamDialog = ({ team, onOpenChange, onSubmit, onCancel }: EditTeamDialogProps) => (
  <Dialog open={!!team} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Team: {team?.name}</DialogTitle>
      </DialogHeader>
      {team && <TeamForm team={team} onSubmit={onSubmit} onCancel={onCancel} />}
    </DialogContent>
  </Dialog>
);

export default EditTeamDialog;
