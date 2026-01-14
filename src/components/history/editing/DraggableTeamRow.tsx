import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Crown, GripVertical, Medal, Users } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

import { EditableTeam } from '../hooks/useHistoryEditing';

interface DraggableTeamRowProps {
  team: EditableTeam;
  rank: number;
}

export const DraggableTeamRow: React.FC<DraggableTeamRowProps> = ({ team, rank }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({
      id: team.team_id,
      data: {
        type: 'team',
        team,
        divisionName: team.division_name,
      },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const winPct =
    team.match_wins + team.match_losses > 0
      ? ((team.match_wins / (team.match_wins + team.match_losses)) * 100).toFixed(0)
      : '0';

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
        'bg-card hover:bg-muted/50',
        isDragging && 'z-50 shadow-lg ring-2 ring-primary/50 scale-[1.02] opacity-90',
        isOver && !isDragging && 'border-primary/50 bg-primary/5',
        'cursor-grab active:cursor-grabbing',
        team.champion && 'border-yellow-400/50 bg-yellow-50/50 dark:bg-yellow-900/10',
        team.runner_up && 'border-gray-400/50 bg-gray-50/50 dark:bg-gray-800/20'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="touch-none p-1 -m-1 rounded hover:bg-muted-foreground/10 transition-colors"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Rank Badge */}
      <div
        className={cn(
          'flex items-center justify-center min-w-[2rem] h-7 rounded-md text-sm font-bold',
          team.champion
            ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
            : team.runner_up
              ? 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
              : 'bg-primary/10 text-primary'
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
        {team.team_logo_url ? (
          <div className="w-7 h-7 rounded-full overflow-hidden bg-muted flex-shrink-0">
            <img
              src={team.team_logo_url}
              alt={`${team.team_name} logo`}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <span className="font-medium truncate">{team.team_name}</span>
      </div>

      {/* Record */}
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {team.match_wins}-{team.match_losses}
        <span className="ml-1 text-xs">({winPct}%)</span>
      </div>
    </motion.div>
  );
};

export default DraggableTeamRow;
