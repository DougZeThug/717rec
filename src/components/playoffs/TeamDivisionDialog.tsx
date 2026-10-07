import { Loader2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Team } from '@/types';

interface TeamDivisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamsByDivision: Record<string, Team[]>;
  availableDivisions: string[];
  teamsLoading: boolean;
  onTeamDivisionChange: (teamId: string, divisionName: string) => void;
}

type TeamDivisionCardProps = Pick<
  TeamDivisionDialogProps,
  'availableDivisions' | 'onTeamDivisionChange'
> & { team: Team };

/** A team's logo and name. */
const TeamIdentity: React.FC<{ team: Team }> = ({ team }) => (
  <div className="flex items-center">
    <div className="size-10 rounded-full overflow-hidden bg-muted mr-2">
      {team.logoUrl ? (
        <img
          src={team.logoUrl}
          alt={team.name}
          loading="lazy"
          decoding="async"
          className="size-full object-contain"
        />
      ) : (
        <div className="size-full flex items-center justify-center bg-muted text-muted-foreground text-xs">
          No Logo
        </div>
      )}
    </div>
    <span className="truncate max-w-[120px]" title={team.name}>
      {team.name}
    </span>
  </div>
);

/** The division picker for one team. */
const TeamDivisionSelect: React.FC<TeamDivisionCardProps> = ({
  team,
  availableDivisions,
  onTeamDivisionChange,
}) => (
  <Select
    value={team.divisionName || 'Unassigned'}
    onValueChange={(value) => onTeamDivisionChange(team.id, value)}
  >
    <SelectTrigger className="w-[140px]" aria-label={`Division for ${team.name}`}>
      <SelectValue placeholder="Division..." />
    </SelectTrigger>
    <SelectContent>
      {availableDivisions.map((d) => (
        <SelectItem key={d} value={d}>
          {d}
        </SelectItem>
      ))}
      <SelectItem value="Unassigned">Unassigned</SelectItem>
    </SelectContent>
  </Select>
);

/** One team with its logo and a division picker. */
const TeamDivisionCard: React.FC<TeamDivisionCardProps> = (props) => (
  <Card className="bg-muted/50">
    <CardContent className="p-3">
      <div className="flex items-center justify-between">
        <TeamIdentity team={props.team} />
        <TeamDivisionSelect {...props} />
      </div>
    </CardContent>
  </Card>
);

const TeamDivisionDialog: React.FC<TeamDivisionDialogProps> = ({
  open,
  onOpenChange,
  teamsByDivision,
  availableDivisions,
  teamsLoading,
  onTeamDivisionChange,
}) => {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Manage Team Divisions</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Assign teams to different divisions for playoff organization.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-2">
          {teamsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-8 animate-spin text-cornhole-navy" />
            </div>
          ) : (
            <div className="space-y-6">
              {availableDivisions.map((division) => (
                <div key={division} className="space-y-3">
                  <h3 className="text-lg font-semibold">{division} Division</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teamsByDivision[division]?.map((team) => (
                      <TeamDivisionCard
                        key={team.id}
                        team={team}
                        availableDivisions={availableDivisions}
                        onTeamDivisionChange={onTeamDivisionChange}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {teamsByDivision['Unassigned']?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Unassigned Teams</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teamsByDivision['Unassigned']?.map((team) => (
                      <TeamDivisionCard
                        key={team.id}
                        team={team}
                        availableDivisions={availableDivisions}
                        onTeamDivisionChange={onTeamDivisionChange}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <ResponsiveDialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default TeamDivisionDialog;
