import { Search, Users } from 'lucide-react';
import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Team } from '@/types';

import TeamListMobile, { TeamItemActionApi } from './TeamListMobile';
import TeamTableDesktop from './TeamTableDesktop';

// display_division is what the public site groups by; useDivisions already
// returns it, the narrower prop type just never named it.
type DivisionOption = { id: string; name: string; display_division?: string };

type ManageTeamsPaneProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  selectedDivision: string;
  onSelectedDivisionChange: (value: string) => void;
  divisions: DivisionOption[];
  filteredTeams: Team[];
  actions: TeamItemActionApi;
};

const TeamManagementFilters = ({
  searchTerm,
  onSearchTermChange,
  selectedDivision,
  onSelectedDivisionChange,
  divisions,
}: Pick<
  ManageTeamsPaneProps,
  | 'searchTerm'
  | 'onSearchTermChange'
  | 'selectedDivision'
  | 'onSelectedDivisionChange'
  | 'divisions'
>) => (
  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
      <Input
        placeholder="Search teams..."
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        className="pl-10"
      />
    </div>
    <Select value={selectedDivision} onValueChange={onSelectedDivisionChange}>
      <SelectTrigger aria-label="Filter teams by division" className="w-full sm:w-48">
        <SelectValue placeholder="Filter by division" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Divisions</SelectItem>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {divisions.map((division) => (
          <SelectItem key={division.id} value={division.id}>
            {division.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

/** A division change the admin has asked for but not yet confirmed. */
type PendingDivisionChange = { teamId: string; teamName: string; value: string };

const ManageTeamsPane = ({
  searchTerm,
  onSearchTermChange,
  selectedDivision,
  onSelectedDivisionChange,
  divisions,
  filteredTeams,
  actions,
}: ManageTeamsPaneProps) => {
  const [pendingChange, setPendingChange] = useState<PendingDivisionChange | null>(null);

  // Both Selects are controlled from server data, so holding the change here
  // leaves the trigger showing the old division until the write lands. That is
  // also why cancelling needs no revert.
  const guardedActions: TeamItemActionApi = {
    ...actions,
    onDivisionChange: (teamId, value) => {
      const team = filteredTeams.find((t) => t.id === teamId);
      setPendingChange({ teamId, teamName: team?.name ?? 'this team', value });
    },
  };

  const target = pendingChange ? divisions.find((d) => d.id === pendingChange.value) : undefined;
  const targetName = pendingChange?.value === 'unassigned' ? 'Unassigned' : (target?.name ?? '');
  const hidesTeam = target?.display_division === 'Hidden';

  const handleConfirm = () => {
    if (!pendingChange) return;
    actions.onDivisionChange(pendingChange.teamId, pendingChange.value);
    setPendingChange(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5" />
          Team Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TeamManagementFilters
          searchTerm={searchTerm}
          onSearchTermChange={onSearchTermChange}
          selectedDivision={selectedDivision}
          onSelectedDivisionChange={onSelectedDivisionChange}
          divisions={divisions}
        />

        <TeamListMobile teams={filteredTeams} divisions={divisions} actions={guardedActions} />
        <TeamTableDesktop teams={filteredTeams} divisions={divisions} actions={guardedActions} />

        {filteredTeams.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No teams found matching your criteria.
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={pendingChange !== null}
        onOpenChange={() => setPendingChange(null)}
        title="Change this team's division?"
        description={
          <>
            <strong>{pendingChange?.teamName}</strong> will move to <strong>{targetName}</strong>.
            {hidesTeam
              ? ' Teams in Hidden do not appear in the standings, the schedule, or public team pages.'
              : ' Standings and the schedule are grouped by division, so this changes where the team appears.'}
          </>
        }
        onConfirm={handleConfirm}
        isPending={actions.isUpdatingTeam(pendingChange?.teamId ?? '')}
        confirmLabel="Change division"
        pendingLabel="Changing..."
        variant="default"
      />
    </Card>
  );
};

export default ManageTeamsPane;
