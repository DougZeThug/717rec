
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerChip } from "./shared/PlayerChip";

interface PlayerListProps {
  players: string[];
}

const PlayerList = ({ players }: PlayerListProps) => {
  if (!players?.length) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4 inline-flex items-center">
        👥 Players
      </h2>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {players.map((player, index) => (
              <PlayerChip 
                key={`${player}-${index}`}
                playerName={player}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerList;
