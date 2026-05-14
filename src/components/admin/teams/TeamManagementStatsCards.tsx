import { Edit, Settings, Users } from 'lucide-react';
import { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';

type TeamManagementStatsCardsProps = {
  teamStats: {
    total: number;
    withDivisions: number;
    unassigned: number;
  };
};

type StatCardProps = {
  icon: ReactNode;
  value: number;
  label: string;
};

const StatCard = ({ icon, value, label }: StatCardProps) => (
  <Card>
    <CardContent className="p-4 flex items-center space-x-2">
      {icon}
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

const TeamManagementStatsCards = ({ teamStats }: TeamManagementStatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        icon={<Users className="size-8 text-primary" />}
        value={teamStats.total}
        label="Total Teams"
      />
      <StatCard
        icon={<Settings className="size-8 text-green-600" />}
        value={teamStats.withDivisions}
        label="Assigned to Divisions"
      />
      <StatCard
        icon={<Edit className="size-8 text-orange-600" />}
        value={teamStats.unassigned}
        label="Unassigned"
      />
    </div>
  );
};

export default TeamManagementStatsCards;
