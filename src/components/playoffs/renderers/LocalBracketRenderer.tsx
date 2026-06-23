import React from 'react';

import { BracketsViewerComponent } from '@/components/playoffs/viewer';
import { PlayoffBracket, PlayoffTeam } from '@/utils/playoffs/playoffTypes';

interface LocalBracketRendererProps {
  bracket: PlayoffBracket;
  teams: PlayoffTeam[];
  onEditMatch?: (matchId: string) => void;
  [key: string]: unknown;
}

export const LocalBracketRenderer: React.FC<LocalBracketRendererProps> = ({
  bracket,
  teams,
  onEditMatch,
  ..._props
}) => {
  if (!bracket) {
    return (
      <div className="text-center p-8">
        <p className="text-lg font-medium text-foreground">No bracket data available</p>
      </div>
    );
  }

  return <BracketsViewerComponent bracket={bracket} teams={teams} onMatchClick={onEditMatch} />;
};
