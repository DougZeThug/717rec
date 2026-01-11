import React from 'react';

import TeamForm from '@/components/teams/TeamForm';
import { Team } from '@/types';

interface TeamEditFormProps {
  team: Team;
  onSubmit: (teamData: Omit<Team, 'id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
}

export const TeamEditForm: React.FC<TeamEditFormProps> = ({ team, onSubmit, onCancel }) => {
  return (
    <div className="mb-6 p-4 sm:p-6 bg-card border rounded-lg shadow overflow-x-hidden">
      <h2 className="text-xl font-semibold mb-4">Edit Team</h2>
      <TeamForm team={team} onSubmit={onSubmit} onCancel={onCancel} />
    </div>
  );
};
