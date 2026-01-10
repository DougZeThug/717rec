import { Users } from 'lucide-react';
import React, { useMemo } from 'react';

import TeamCard from '@/components/teams/TeamCard';
import { TeamListSkeleton } from '@/components/teams/TeamListSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Team } from '@/types';

interface TeamListProps {
  teams: Team[];
  isLoading: boolean;
  onEdit: (team: Team) => void;
  onDelete: (teamId: string) => void;
  viewMode: 'grid' | 'list';
}

export const TeamList: React.FC<TeamListProps> = ({
  teams,
  isLoading,
  onEdit,
  onDelete,
  viewMode,
}) => {
  // Create a deduplicated array of teams by team ID
  const uniqueTeams = useMemo(() => {
    const uniqueTeamMap = new Map<string, Team>();

    teams.forEach((team) => {
      if (!uniqueTeamMap.has(team.id)) {
        uniqueTeamMap.set(team.id, team);
      }
    });

    return Array.from(uniqueTeamMap.values());
  }, [teams]);

  if (isLoading) {
    return <TeamListSkeleton viewMode={viewMode} />;
  }

  if (uniqueTeams.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No Teams Found"
        description="No teams match your current filters. Try adjusting your search or add a new team to get started."
        actions={[
          {
            label: 'View All Teams',
            onClick: () => window.location.reload(),
            variant: 'outline',
          },
        ]}
      />
    );
  }

  // Enhanced grid classes with tighter mobile layout
  const gridClasses =
    viewMode === 'grid'
      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-3'
      : 'space-y-4';

  return (
    <div className={gridClasses}>
      {uniqueTeams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          onDelete={(teamId) => onDelete(teamId)}
          onEdit={(team) => onEdit(team)}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
};
