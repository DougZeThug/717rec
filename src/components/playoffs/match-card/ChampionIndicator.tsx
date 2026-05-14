import React from 'react';

import { blueAmber } from '@/styles/design-system';
import { Team } from '@/types';

interface ChampionIndicatorProps {
  winner: Team | null;
}

const ChampionIndicator: React.FC<ChampionIndicatorProps> = ({ winner }) => {
  if (!winner) return null;

  return (
    <div className="mt-2 pt-2 border-t border-border dark:border-border text-center">
      <div className="text-xs text-muted-foreground dark:text-muted-foreground">Champion</div>
      <div className={blueAmber.text.heading + ' font-semibold'}>{winner.name}</div>
    </div>
  );
};

export default ChampionIndicator;
