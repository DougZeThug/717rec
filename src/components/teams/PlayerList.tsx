import { Users } from 'lucide-react';
import React from 'react';

import { CollapsibleSection } from '@/components/ui/CollapsibleSection';

import { PlayerChip } from './shared/PlayerChip';

interface PlayerListProps {
  players: string[];
}

const PlayerList = ({ players }: PlayerListProps) => {
  return (
    <CollapsibleSection title="Roster" icon={Users} iconColor="text-blue-500" defaultOpen={true}>
      {!players?.length ? (
        <div className="text-center py-6">
          <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No players registered</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Player information will appear once added
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {players.map((player, index) => (
            <PlayerChip key={`${player}-${index}`} playerName={player} />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
};

export default PlayerList;
