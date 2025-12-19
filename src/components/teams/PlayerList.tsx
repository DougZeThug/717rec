import React from "react";
import { PlayerChip } from "./shared/PlayerChip";
import { Users } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

interface PlayerListProps {
  players: string[];
}

const PlayerList = ({ players }: PlayerListProps) => {
  if (!players?.length) return null;

  return (
    <CollapsibleSection
      title="Players"
      icon={Users}
      iconColor="text-blue-500"
      defaultOpen={true}
    >
      <div className="flex flex-wrap gap-2">
        {players.map((player, index) => (
          <PlayerChip 
            key={`${player}-${index}`}
            playerName={player}
          />
        ))}
      </div>
    </CollapsibleSection>
  );
};

export default PlayerList;
