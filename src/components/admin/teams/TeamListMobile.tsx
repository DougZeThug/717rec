import { motion } from 'framer-motion';
import { Edit, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Team } from '@/types';

type DivisionOption = { id: string; name: string };

export type TeamItemActionApi = {
  onEdit: (team: Team) => void;
  onDivisionChange: (teamId: string, value: string) => void;
  isUpdatingTeam: (teamId: string) => boolean;
};

type TeamListMobileProps = {
  teams: Team[];
  divisions: DivisionOption[];
  actions: TeamItemActionApi;
};

const TeamListMobile = ({ teams, divisions, actions }: TeamListMobileProps) => (
  <div className="space-y-3 sm:hidden">
    {teams.map((team) => (
      <div key={team.id} className="border border-border rounded-lg p-3 space-y-2 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {team.logoUrl || team.imageUrl ? (
              <img src={team.logoUrl || team.imageUrl} alt={team.name} className="h-6 w-6 rounded-full object-cover shrink-0" />
            ) : (
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Users className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <span className="font-medium text-sm truncate">{team.name}</span>
          </div>
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button variant="outline" size="sm" onClick={() => actions.onEdit(team)}>
              <Edit className="h-3 w-3" />
            </Button>
          </motion.div>
        </div>
        <Select
          value={team.division_id || 'unassigned'}
          onValueChange={(value) => actions.onDivisionChange(team.id, value)}
          disabled={actions.isUpdatingTeam(team.id)}
        >
          <SelectTrigger className="w-full">
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
      </div>
    ))}
  </div>
);

export default TeamListMobile;
