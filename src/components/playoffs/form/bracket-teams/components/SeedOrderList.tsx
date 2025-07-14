import React from 'react';
import { Button } from '@/components/ui/button';
import { GripVertical, Users } from 'lucide-react';
import { ProcessedTeam } from '../types';
import { SeedInputField } from './SeedInputField';
import { handleDragDropReorder } from '../utils/dragAndDrop';

interface SeedOrderListProps {
  teams: ProcessedTeam[];
  isManualMode: boolean;
  conflictTeamIds: Set<string>;
  onTeamReorder: (teams: ProcessedTeam[]) => void;
  onSeedChange: (teamId: string, seed: number | null) => void;
}

export const SeedOrderList: React.FC<SeedOrderListProps> = ({
  teams,
  isManualMode,
  conflictTeamIds,
  onTeamReorder,
  onSeedChange,
}) => {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null) return;
    
    const result = handleDragDropReorder(teams, draggedIndex, dropIndex);
    
    if (result.wasReordered) {
      onTeamReorder(result.reorderedTeams);
    }
    
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-2">
      {teams.map((team, index) => (
        <div
          key={team.id}
          draggable={isManualMode}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
          className={`
            flex items-center gap-3 p-3 rounded-lg border transition-colors
            ${draggedIndex === index ? 'opacity-50' : ''}
            ${isManualMode ? 'bg-muted/50 hover:bg-muted cursor-move' : 'bg-background'}
          `}
        >
          {isManualMode && (
            <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          
          <div className="flex items-center gap-2 flex-1">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={`${team.name} logo`}
                className="w-6 h-6 object-contain"
              />
            ) : (
              <Users className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="font-medium">{team.name}</span>
          </div>
          
          <SeedInputField
            teamId={team.id}
            teamName={team.name}
            seed={team.seed}
            isManualMode={isManualMode}
            hasConflict={conflictTeamIds.has(team.id)}
            onSeedChange={onSeedChange}
          />
        </div>
      ))}
    </div>
  );
};