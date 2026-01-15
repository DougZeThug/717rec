import { Crown, GripVertical, Medal, Users } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

import { EditableTeam } from '../hooks/useHistoryEditing';

interface TeamDragOverlayProps {
  team: EditableTeam;
  rank: number;
}

export const TeamDragOverlay: React.FC<TeamDragOverlayProps> = ({ team, rank }) => {
  const winPct =
    team.match_wins + team.match_losses > 0
      ? ((team.match_wins / (team.match_wins + team.match_losses)) * 100).toFixed(0)
      : '0';

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border-2 border-primary',
        'bg-card shadow-2xl pointer-events-none min-w-[280px]',
        'ring-4 ring-primary/20',
        team.champion && 'border-yellow-500',
        team.runner_up && 'border-gray-500'
      )}
    >
      {/* Drag Handle */}
      <div className="p-1 -m-1">
        <GripVertical className="w-4 h-4 text-primary" />
      </div>

      {/* Rank Badge */}
      <div
        className={cn(
          'flex items-center justify-center min-w-[2rem] h-7 rounded-md text-sm font-bold',
          team.champion
            ? 'bg-yellow-500 text-white'
            : team.runner_up
              ? 'bg-gray-500 text-white'
              : 'bg-primary text-primary-foreground'
        )}
      >
        {team.champion ? (
          <Crown className="w-4 h-4" />
        ) : team.runner_up ? (
          <Medal className="w-4 h-4" />
        ) : (
          `#${rank}`
        )}
      </div>

      {/* Team Info */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {(team.team_image_url || team.team_logo_url) ? (
          <div className="w-7 h-7 rounded-full overflow-hidden bg-muted flex-shrink-0">
            <img
              src={team.team_image_url || team.team_logo_url || ''}
              alt={`${team.team_name} logo`}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <span className="font-semibold">{team.team_name}</span>
      </div>

      {/* Record */}
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {team.match_wins}-{team.match_losses}
        <span className="ml-1 text-xs">({winPct}%)</span>
      </div>
    </div>
  );
};

export default TeamDragOverlay;
