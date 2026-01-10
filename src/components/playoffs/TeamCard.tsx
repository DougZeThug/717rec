import React from 'react';

import { TeamLogo } from '@/components/ui/team';
import type { Team } from '@/types';

interface Props {
  team: Team & { seed?: number };
  selected: boolean;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

const TeamCard: React.FC<Props> = ({ team, selected, onToggle, disabled = false }) => (
  <button
    onClick={() => !disabled && onToggle(team.id)}
    disabled={disabled}
    className={`flex items-center p-2 rounded cursor-pointer transition-colors w-full ${
      selected
        ? 'bg-cornhole-green/20 border border-cornhole-green'
        : disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-gray-100'
    }`}
  >
    <div className="mr-3 flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-xs font-bold text-blue-800">
      {team.seed}
    </div>
    <div className="mr-2">
      <TeamLogo
        imageUrl={team.logoUrl || team.imageUrl}
        teamName={team.name || 'Unnamed Team'}
        size="sm"
      />
    </div>
    <div className="flex-1">
      <div className="font-medium text-left">{team.name || 'Unnamed Team'}</div>
      <div className="text-xs text-gray-500">
        Power:{' '}
        {team.power_score && team.power_score > 0 ? (team.power_score * 100).toFixed(1) : 'TBD'}
      </div>
    </div>
    <span className="ml-auto text-xs text-gray-500">
      {team.wins || 0}-{team.losses || 0}
    </span>
  </button>
);

export default TeamCard;
