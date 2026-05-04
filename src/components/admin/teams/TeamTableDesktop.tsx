import { motion } from 'framer-motion';
import { Edit, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Team } from '@/types';

import { TeamItemActionApi } from './TeamListMobile';

type DivisionOption = { id: string; name: string };

type TeamTableDesktopProps = {
  teams: Team[];
  divisions: DivisionOption[];
  actions: TeamItemActionApi;
};

type TeamTableRowProps = {
  team: Team;
  divisions: DivisionOption[];
  actions: TeamItemActionApi;
};

const TeamAvatar = ({ team }: { team: Team }) =>
  team.logoUrl || team.imageUrl ? (
    <img
      src={team.logoUrl || team.imageUrl}
      alt={team.name}
      className="h-6 w-6 rounded-full object-cover shrink-0"
    />
  ) : (
    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
      <Users className="h-3 w-3 text-muted-foreground" />
    </div>
  );

const TeamDivisionCell = ({ team, divisions, actions }: TeamTableRowProps) => (
  <Select
    value={team.division_id || 'unassigned'}
    onValueChange={(value) => actions.onDivisionChange(team.id, value)}
    disabled={actions.isUpdatingTeam(team.id)}
  >
    <SelectTrigger className="w-40">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="unassigned">
        <Badge variant="secondary">Unassigned</Badge>
      </SelectItem>
      {divisions.map((division) => (
        <SelectItem key={division.id} value={division.id}>
          {division.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const TeamTableHeader = () => (
  <TableHeader>
    <TableRow>
      <TableHead>Team</TableHead>
      <TableHead>Division</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
);

const TeamTableRowItem = ({ team, divisions, actions }: TeamTableRowProps) => (
  <TableRow className="transition-colors duration-150 hover:bg-muted/50 active:bg-muted">
    <TableCell>
      <div className="flex items-center gap-2">
        <TeamAvatar team={team} />
        <span className="font-medium">{team.name}</span>
      </div>
    </TableCell>
    <TableCell>
      <TeamDivisionCell team={team} divisions={divisions} actions={actions} />
    </TableCell>
    <TableCell>
      <motion.div whileTap={{ scale: 0.9 }}>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Edit ${team.name}`}
          onClick={() => actions.onEdit(team)}
        >
          <Edit className="h-3 w-3" />
        </Button>
      </motion.div>
    </TableCell>
  </TableRow>
);

const TeamTableDesktop = ({ teams, divisions, actions }: TeamTableDesktopProps) => (
  <div className="border rounded-lg hidden sm:block">
    <Table>
      <TeamTableHeader />
      <TableBody>
        {teams.map((team) => (
          <TeamTableRowItem key={team.id} team={team} divisions={divisions} actions={actions} />
        ))}
      </TableBody>
    </Table>
  </div>
);

export default TeamTableDesktop;
