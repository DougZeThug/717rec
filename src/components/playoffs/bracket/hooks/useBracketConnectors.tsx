
import { useMemo, useEffect, useState } from "react";
import { PlayoffMatch } from "@/types";
import { getBracketConnectorPaths } from "../../BracketUtils";

/**
 * Hook for calculating bracket connector paths with proper DOM timing
 */
export const useBracketConnectors = (winners: PlayoffMatch[][], losers: PlayoffMatch[][], finals: PlayoffMatch[]) => {
  const [connectorPaths, setConnectorPaths] = useState({
    winnersConnectorPaths: [] as string[],
    losersConnectorPaths: [] as string[],
    crossConnectorPaths: [] as string[],
    finalsConnectorPaths: [] as string[]
  });

  // Calculate connector paths after DOM elements are rendered
  useEffect(() => {
    const calculateConnectors = () => {
      console.log('🔍 useBracketConnectors - Calculating connector paths...');
      
      const winnersFlattened = winners.flatMap(round => round);
      const losersFlattened = losers.flatMap(round => round);
      
      console.log('🔍 useBracketConnectors - Flattened data:', {
        winnersMatches: winnersFlattened.length,
        losersMatches: losersFlattened.length,
        finalsMatches: finals.length
      });

      const winnersConnectorPaths = getBracketConnectorPaths(winnersFlattened);
      const losersConnectorPaths = getBracketConnectorPaths(losersFlattened);
      const finalsConnectorPaths = getBracketConnectorPaths(finals);
      
      // Calculate cross-bracket connectors (winners to losers)
      const crossConnectorPaths: string[] = [];
      
      // For each winners bracket match, check if it has a nextLoseMatchId
      winnersFlattened.forEach(winnersMatch => {
        if (winnersMatch.nextLoseMatchId) {
          const loserMatch = losersFlattened.find(m => m.id === winnersMatch.nextLoseMatchId);
          if (loserMatch) {
            // Create a connector path from winners match to losers match
            const winnersElement = document.querySelector(`[data-match-id="${winnersMatch.id}"]`);
            const losersElement = document.querySelector(`[data-match-id="${loserMatch.id}"]`);
            
            if (winnersElement && losersElement) {
              const winnersRect = winnersElement.getBoundingClientRect();
              const losersRect = losersElement.getBoundingClientRect();
              
              // Create a path that goes from bottom of winners match to top of losers match
              const startX = winnersRect.right - winnersRect.left / 2;
              const startY = winnersRect.bottom;
              const endX = losersRect.left + losersRect.width / 2;
              const endY = losersRect.top;
              
              const path = `M ${startX} ${startY} L ${startX} ${startY + 20} L ${endX} ${endY - 20} L ${endX} ${endY}`;
              crossConnectorPaths.push(path);
            }
          }
        }
      });

      setConnectorPaths({
        winnersConnectorPaths,
        losersConnectorPaths,
        crossConnectorPaths,
        finalsConnectorPaths
      });
      
      console.log('🔍 useBracketConnectors - Connector paths calculated:', {
        winners: winnersConnectorPaths.length,
        losers: losersConnectorPaths.length,
        cross: crossConnectorPaths.length,
        finals: finalsConnectorPaths.length
      });
    };

    // Delay calculation to ensure DOM elements are rendered
    const timer = setTimeout(calculateConnectors, 100);
    return () => clearTimeout(timer);
  }, [winners, losers, finals]);

  return connectorPaths;
};
