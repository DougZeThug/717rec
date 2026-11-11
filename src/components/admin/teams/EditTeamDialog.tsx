import TeamForm from '@/components/teams/TeamForm';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Team } from '@/types';

type EditTeamDialogProps = {
  team: Team | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (teamData: Omit<Team, 'id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
};

// On a phone this is a bottom sheet. A swipe down cannot ask first and the form
// is long, so a stray swipe while scrolling must not throw the edits away:
// the sheet closes only from its own Cancel or Save.
const EditTeamDialog = ({ team, onOpenChange, onSubmit, onCancel }: EditTeamDialogProps) => (
  <ResponsiveDialog open={Boolean(team)} onOpenChange={onOpenChange} dismissible={false}>
    <ResponsiveDialogContent className="sm:max-w-2xl">
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>Edit Team: {team?.name}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription className="sr-only">
          Change the team name, logo, division and members.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
      {team && <TeamForm team={team} onSubmit={onSubmit} onCancel={onCancel} />}
    </ResponsiveDialogContent>
  </ResponsiveDialog>
);

export default EditTeamDialog;
