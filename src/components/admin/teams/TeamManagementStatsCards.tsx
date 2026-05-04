import { Edit, Settings, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

type TeamManagementStatsCardsProps = {
  teamStats: {
    total: number;
    withDivisions: number;
    unassigned: number;
  };
};

const TeamManagementStatsCards = ({ teamStats }: TeamManagementStatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4 flex items-center space-x-2">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">{teamStats.total}</p>
            <p className="text-sm text-muted-foreground">Total Teams</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center space-x-2">
          <Settings className="h-8 w-8 text-green-600" />
          <div>
            <p className="text-2xl font-bold">{teamStats.withDivisions}</p>
            <p className="text-sm text-muted-foreground">Assigned to Divisions</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center space-x-2">
          <Edit className="h-8 w-8 text-orange-600" />
          <div>
            <p className="text-2xl font-bold">{teamStats.unassigned}</p>
            <p className="text-sm text-muted-foreground">Unassigned</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamManagementStatsCards;
