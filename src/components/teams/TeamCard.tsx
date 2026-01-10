import React from 'react';

import { Team } from '@/types';
import { warnLog } from '@/utils/logger';

import { TeamCardGrid } from './grid/TeamCardGrid';
import { TeamCardList } from './list/TeamCardList';

interface TeamCardProps {
  team: Team;
  onDelete?: (id: string) => void;
  onEdit?: (team: Team) => void;
  viewMode: 'grid' | 'list';
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onDelete, onEdit, viewMode }) => {
  switch (viewMode) {
    case 'list':
      return <TeamCardList team={team} onDelete={onDelete} onEdit={onEdit} />;
    case 'grid':
      return <TeamCardGrid team={team} onDelete={onDelete} onEdit={onEdit} />;
    default:
      warnLog(`Unknown viewMode: ${viewMode}, falling back to grid view`);
      return <TeamCardGrid team={team} onDelete={onDelete} onEdit={onEdit} />;
  }
};

export default TeamCard;
