import { Search, Users } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

type DivisionOption = { id: string; name: string };

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
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        placeholder="Search teams..."
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        className="pl-10"
      />
    </div>
    <Select value={selectedDivision} onValueChange={onSelectedDivisionChange}>
      <SelectTrigger className="w-full sm:w-48">
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

const ManageTeamsPane = ({
  searchTerm,
  onSearchTermChange,
  selectedDivision,
  onSelectedDivisionChange,
  divisions,
  filteredTeams,
  actions,
}: ManageTeamsPaneProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Users className="h-5 w-5" />
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

      <TeamListMobile teams={filteredTeams} divisions={divisions} actions={actions} />
      <TeamTableDesktop teams={filteredTeams} divisions={divisions} actions={actions} />

      {filteredTeams.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No teams found matching your criteria.
        </div>
      )}
    </CardContent>
  </Card>
);

export default ManageTeamsPane;
