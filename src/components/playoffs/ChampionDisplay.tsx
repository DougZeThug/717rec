
import React from "react";
import { Trophy } from "lucide-react";
import type { Team } from "@/types";

interface ChampionDisplayProps {
  championId: string | undefined;
  teams: Team[];
}

const ChampionDisplay: React.FC<ChampionDisplayProps> = ({ championId, teams }) => {
  if (!championId) return null;
  
  const champion = teams.find(t => t.id === championId);
  if (!champion) return null;
  
  return (
    <div className="mt-8 text-center">
      <div className="text-xl font-bold text-cornhole-navy mb-2">Champion</div>
      <div className="inline-flex items-center bg-cornhole-cream rounded-full px-6 py-3">
        <Trophy className="h-6 w-6 mr-2 text-cornhole-wood" />
        <span className="text-lg font-bold">{champion.name}</span>
      </div>
    </div>
  );
};

export default ChampionDisplay;
