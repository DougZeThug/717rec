
import React, { useState, useMemo } from 'react';
import type { PlayoffMatch, Team } from "@/types";
import ChampionDisplay from "../../celebration/ChampionDisplay";

/**
 * Hook for handling champion display logic
 */
export const useChampionDisplay = (finals: PlayoffMatch[], teams: Team[]) => {
  const [showChampion, setShowChampion] = useState(true);
  
  // Find the champion if the tournament is complete
  const champion = useMemo(() => {
    if (finals.length > 0) {
      const lastFinals = finals[finals.length - 1];
      
      if (lastFinals.winnerId) {
        return teams.find(team => team.id === lastFinals.winnerId) || null;
      }
    }
    
    return null;
  }, [finals, teams]);

  // Render champion display if needed
  const championDisplay = champion && showChampion ? (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <ChampionDisplay 
        champion={champion} 
        onClose={() => setShowChampion(false)} 
        showConfetti={true}
      />
    </div>
  ) : null;

  return { champion, championDisplay };
};
