import { Users } from 'lucide-react';
import React from 'react';

import { CollapsibleSection } from '@/components/ui/CollapsibleSection';

import { PlayerChip } from './shared/PlayerChip';

interface PlayerListProps {
  players: string[];
}

const PlayerList = ({ players }: PlayerListProps) => {
  return (
    <CollapsibleSection title="Roster" icon={Users} iconColor="text-blue-500" defaultOpen>
      {!players?.length ? (
        <div className="text-center py-6">
          <Users className="size-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No players registered</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Player information will appear once added
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {players.map((player, index) => {
            // Use the player name when unique, otherwise disambiguate by occurrence
            // index against earlier identical names so React keys stay stable when
            // unrelated entries change.
            const occurrence = players.slice(0, index).filter((p) => p === player).length;
            const key = occurrence === 0 ? player : `${player}#${occurrence}`;
            // The chip cuts a name at 80px. A roster has room for 160px, so most names show in full.
            return <PlayerChip key={key} playerName={player} className="[&>span]:max-w-40" />;
          })}
        </div>
      )}
    </CollapsibleSection>
  );
};

export default PlayerList;
