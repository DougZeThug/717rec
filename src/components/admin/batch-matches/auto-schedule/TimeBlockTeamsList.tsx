
import React from 'react';
import { Team } from '@/types';
import TeamLogo from '@/components/ui/team/TeamLogo';
import { Badge } from '@/components/ui/badge';

interface TimeBlockTeamsListProps {
  teams: Team[];
  unmatchedTeamIds?: string[];
}

export const TimeBlockTeamsList: React.FC<TimeBlockTeamsListProps> = ({ 
  teams,
  unmatchedTeamIds = []
}) => {
  if (teams.length === 0) {
    return (
      <div className="text-center py-2 text-sm text-muted-foreground">
        No teams assigned to this block
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {teams.map((team) => {
        const isUnmatched = unmatchedTeamIds.includes(team.id);
        
        return (
          <div 
            key={team.id} 
            className={`
              flex items-center gap-2 p-2 border rounded-md
              ${isUnmatched ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20' : ''}
            `}
          >
            <TeamLogo 
              imageUrl={team.logoUrl} 
              teamName={team.name} 
              className="h-6 w-6" 
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm truncate block">{team.name}</span>
              {isUnmatched && (
                <Badge 
                  variant="outline" 
                  className="text-xs mt-1 bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-800"
                >
                  Unmatched
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
