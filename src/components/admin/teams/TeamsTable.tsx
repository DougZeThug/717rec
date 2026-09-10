import { m } from 'framer-motion';
import { Edit, Users } from 'lucide-react';
import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Team } from '@/types';

type DivisionOption = { id: string; name: string };

export type TeamItemActionApi = {
  onEdit: (team: Team) => void;
  onDivisionChange: (teamId: string, value: string) => void;
  isUpdatingTeam: (teamId: string) => boolean;
};

type TeamsTableProps = {
  teams: Team[];
  divisions: DivisionOption[];
  actions: TeamItemActionApi;
};

const TeamAvatar = ({ team }: { team: Team }) =>
  team.logoUrl || team.imageUrl ? (
    <img
      src={team.logoUrl || team.imageUrl || undefined}
      alt={team.name}
      className="size-6 rounded-full object-cover shrink-0"
    />
  ) : (
    <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0">
      <Users className="size-3 text-muted-foreground" />
    </div>
  );

const TeamDivisionSelect = ({
  team,
  divisions,
  actions,
}: { team: Team } & Omit<TeamsTableProps, 'teams'>) => (
  <Select
    value={team.division_id || 'unassigned'}
    onValueChange={(value) => actions.onDivisionChange(team.id, value)}
    disabled={actions.isUpdatingTeam(team.id)}
  >
    {/* Full width in a card, fixed in a table cell. */}
    <SelectTrigger aria-label={`Set division for ${team.name}`} className="w-full md:w-40">
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

/**
 * The admin team list.
 *
 * This was two files — `TeamTableDesktop` and `TeamListMobile` — with an
 * identical `TeamAvatar`, a division `<Select>` that differed only by width,
 * and two breakpoints that disagreed (`sm:` against the shell's `md:`). One
 * `columns` array replaces both, and the breakpoint now lives only in
 * `useIsMobile()`. See L3 and A-15 in `docs/audits/UX-AUDIT-2026-09.md`.
 */
const TeamsTable = ({ teams, divisions, actions }: TeamsTableProps) => {
  // Built here rather than at module scope because the cells close over the
  // per-pane action handlers.
  const columns = useMemo<ResponsiveTableColumn<Team>[]>(
    () => [
      {
        id: 'name',
        header: 'Team',
        card: 'title',
        cell: (team) => (
          <div className="flex items-center gap-2 min-w-0">
            <TeamAvatar team={team} />
            <span className="font-medium truncate">{team.name}</span>
          </div>
        ),
      },
      {
        id: 'division',
        header: 'Division',
        card: 'block',
        cell: (team) => <TeamDivisionSelect team={team} divisions={divisions} actions={actions} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        card: 'actions',
        cell: (team) => (
          <m.div whileTap={{ scale: 0.9 }}>
            <Button
              variant="outline"
              size="sm"
              aria-label={`Edit ${team.name}`}
              onClick={() => actions.onEdit(team)}
            >
              <Edit className="size-3" />
            </Button>
          </m.div>
        ),
      },
    ],
    [divisions, actions]
  );

  return (
    <ResponsiveTable
      caption="Teams and their divisions"
      columns={columns}
      rows={teams}
      rowKey={(team) => team.id}
    />
  );
};

export default TeamsTable;
